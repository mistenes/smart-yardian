"""Runtime manager and safe irrigation scheduler."""

from __future__ import annotations

import asyncio
import logging
from urllib.parse import quote
from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from homeassistant.components import persistent_notification
from homeassistant.const import ATTR_ENTITY_ID, STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .const import (
    CONF_NOTIFY_SERVICE,
    CONF_WEATHER_ENTITY,
    CONF_ZONE_ENTITIES,
    DOMAIN,
    MAX_QUEUE_DELAY_SECONDS,
    RAIN_MAP_CACHE_SECONDS,
    START_CONFIRM_SECONDS,
    STOP_CONFIRM_SECONDS,
)
from .irrigation import (
    ZoneProfile,
    reference_duration_minutes,
    seasonal_target,
)
from .models import ForecastHour, IrrigationProgram, ProgramZone, RunRecord, WeatherDecision
from .ntfy import ntfy_link
from .planning import upcoming_occurrences
from .rainfall import (
    IDOKEP_RAIN_MAP_URL,
    RainObservation,
    find_rain_stations,
    parse_idokep_rain_map,
)
from .storage import SmartYardianStore
from .weather import (
    WindAssessment,
    WeatherUnavailableError,
    evaluate_calendar_day,
    find_wind_delay,
    is_plausible_celsius,
    normalize_ha_forecast,
    rebase_idokep_timeline,
    validate_idokep_location,
)

_LOGGER = logging.getLogger(__name__)
UNAVAILABLE_STATES = {"unavailable", "unknown"}


class SmartYardianManager:
    """Own programs, weather evaluation and serialized Yardian execution."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry_id: str,
        config: dict[str, Any],
    ) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.config = config
        self.store = SmartYardianStore(hass, entry_id)
        self.status = "idle"
        self.active_run: dict[str, Any] | None = None
        self.last_decision: WeatherDecision | None = None
        self.last_error: str | None = None
        self.last_rain_observation: dict[str, Any] | None = None
        self.last_rain_error: str | None = None
        self._rain_observations: list[RainObservation] = []
        self._rain_observations_at: datetime | None = None
        self._run_lock = asyncio.Lock()
        self._stop_event = asyncio.Event()
        self._skip_zone_event = asyncio.Event()
        self._listeners: set[Callable[[], None]] = set()
        self._remove_time_listener: Callable[[], None] | None = None
        self._tasks: set[asyncio.Task[Any]] = set()

    @property
    def zone_entities(self) -> list[str]:
        """Configured Yardian zone entities."""
        return list(self.config.get(CONF_ZONE_ENTITIES) or [])

    async def async_setup(self) -> None:
        """Load storage, recover interrupted work and start scheduler."""
        await self.store.async_load()
        generated_settings = self.store.ensure_generated_settings()
        added_profiles = False
        for entity_id in self.zone_entities:
            if entity_id not in self.store.zone_profiles:
                self.store.zone_profiles[entity_id] = ZoneProfile.default(entity_id)
                added_profiles = True
        if added_profiles or generated_settings:
            await self.store.async_save()
        self._remove_time_listener = async_track_time_change(
            self.hass,
            self._async_minute_tick,
            second=0,
        )
        if self.store.runtime.get("active_run"):
            interrupted = self.store.runtime["active_run"]
            await self.async_stop_all()
            record = RunRecord(
                run_id=str(interrupted.get("run_id") or uuid4()),
                program_id=interrupted.get("program_id"),
                program_name=str(interrupted.get("program_name") or "Ismeretlen program"),
                scheduled_at=str(interrupted.get("scheduled_at") or dt_util.utcnow().isoformat()),
                started_at=interrupted.get("started_at"),
                completed_at=dt_util.utcnow().isoformat(),
                outcome="interrupted",
                reason="A Home Assistant újraindult; a futás biztonságosan leállt.",
                factor=float(interrupted.get("factor") or 1),
                weather_source=str(interrupted.get("weather_source") or "ismeretlen"),
                zones=list(interrupted.get("zones") or []),
                weather=interrupted.get("weather"),
            )
            self.store.runtime.pop("active_run", None)
            await self.store.async_add_history(record.as_dict())
            await self.async_notify(record.reason, "Öntözés megszakítva")

    async def async_unload(self) -> None:
        """Stop callbacks and running tasks."""
        if self._remove_time_listener:
            self._remove_time_listener()
            self._remove_time_listener = None
        self._stop_event.set()
        for task in tuple(self._tasks):
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)

    def async_add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Register an entity/frontend refresh listener."""
        self._listeners.add(listener)
        return lambda: self._listeners.discard(listener)

    def _notify_listeners(self) -> None:
        for listener in tuple(self._listeners):
            listener()

    def _create_task(self, coro: Any, name: str) -> None:
        task = self.hass.async_create_task(coro, name)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _async_minute_tick(self, now: datetime) -> None:
        """Start matching programs once per local minute."""
        local_now = dt_util.as_local(now).replace(second=0, microsecond=0)
        if not self.automation_available(local_now):
            return
        key_date = local_now.date().isoformat()
        executed = self.store.runtime.setdefault("executed", [])
        if len(executed) > 500:
            executed[:] = executed[-250:]
        await self._async_run_due_delayed(local_now, executed)

        for program in self.store.programs:
            run_key = f"{program.program_id}:{key_date}:{program.start_time}"
            if (
                program.enabled
                and local_now.weekday() in program.weekdays
                and local_now.strftime("%H:%M") == program.start_time
                and run_key not in executed
            ):
                executed.append(run_key)
                await self.store.async_save()
                if program.skip_next:
                    program.skip_next = False
                    await self.store.async_save()
                    await self._async_record_skip(
                        program, local_now, "A következő futást a felhasználó kihagyta."
                    )
                    continue
                self._create_task(
                    self.async_run_program(
                        program,
                        local_now,
                        allow_wind_delay=True,
                        run_key=run_key,
                        original_scheduled_at=local_now,
                    ),
                    f"{DOMAIN}_program_{program.program_id}",
                )

    async def _async_run_due_delayed(
        self,
        local_now: datetime,
        executed: list[str],
    ) -> None:
        """Start persisted wind-delayed runs that are due."""
        delayed_runs = list(self.store.runtime.get("delayed_runs") or [])
        if not delayed_runs:
            return
        remaining: list[dict[str, Any]] = []
        changed = False
        for item in delayed_runs:
            try:
                delayed_at = datetime.fromisoformat(str(item["scheduled_at"]))
                if delayed_at.tzinfo is None:
                    delayed_at = delayed_at.replace(tzinfo=local_now.tzinfo)
                delayed_at = delayed_at.astimezone(local_now.tzinfo)
                run_key = str(item["run_key"])
                program = self.get_program(str(item["program_id"]))
            except (KeyError, TypeError, ValueError):
                changed = True
                continue

            if delayed_at > local_now:
                remaining.append(item)
                continue

            changed = True
            if delayed_at.date() != local_now.date():
                await self._async_record_skip(
                    program,
                    delayed_at,
                    "A szél miatt halasztott futás már nem aktuális.",
                )
                continue

            if run_key not in executed:
                executed.append(run_key)
            original_scheduled_at = _parse_runtime_datetime(
                item.get("original_scheduled_at"),
                delayed_at,
            )
            self._create_task(
                self.async_run_program(
                    program,
                    delayed_at,
                    allow_wind_delay=True,
                    run_key=run_key,
                    original_scheduled_at=original_scheduled_at,
                ),
                f"{DOMAIN}_delayed_{program.program_id}",
            )

        if changed:
            self.store.runtime["delayed_runs"] = remaining
            await self.store.async_save()
            self._notify_listeners()

    def automation_available(self, now: datetime | None = None) -> bool:
        """Return whether scheduled automation may run."""
        if not self.store.settings.get("automation_enabled", True):
            return False
        paused_until = self.store.settings.get("paused_until")
        if not paused_until:
            return True
        try:
            until = datetime.fromisoformat(str(paused_until))
            if until.tzinfo is None:
                until = until.replace(tzinfo=UTC)
            current = now or dt_util.utcnow()
            return current >= until
        except ValueError:
            return True

    async def async_set_automation(self, enabled: bool) -> None:
        """Enable or disable scheduled programs."""
        self.store.settings["automation_enabled"] = enabled
        await self.store.async_save()
        self._notify_listeners()

    async def async_pause_until(self, until: datetime | None) -> None:
        """Pause scheduled irrigation until a timestamp."""
        self.store.settings["paused_until"] = until.isoformat() if until else None
        await self.store.async_save()
        self._notify_listeners()

    async def async_weather_decision(
        self,
        scheduled_at: datetime | None = None,
    ) -> WeatherDecision:
        """Evaluate the configured Időkép hourly forecast."""
        target = scheduled_at or dt_util.as_local(dt_util.now())

        try:
            forecast = await self._async_idokep_forecast()
            observation = await self._async_selected_rain_observation()
            decision = evaluate_calendar_day(
                forecast,
                "Időkép",
                target,
                settings=self.store.settings,
                observed_precipitation_mm=(
                    observation.measured_mm
                    if observation
                    and target.date() == dt_util.as_local(dt_util.now()).date()
                    else 0.0
                ),
                rain_station=(
                    f"{observation.location} ({observation.station_id})"
                    if observation
                    and target.date() == dt_util.as_local(dt_util.now()).date()
                    else None
                ),
            )
            self.last_decision = decision
            self.last_error = None
            self._notify_listeners()
            return decision
        except (KeyError, TypeError, ValueError, WeatherUnavailableError) as err:
            self.last_decision = None
            self.last_error = f"Időkép: {err}"
            self._notify_listeners()
            raise WeatherUnavailableError(self.last_error) from err

    async def _async_rain_observations(
        self,
        *,
        force: bool = False,
    ) -> list[RainObservation]:
        """Fetch and cache the measured 24-hour Időkép station observations."""
        now = dt_util.utcnow()
        if (
            not force
            and self._rain_observations
            and self._rain_observations_at is not None
            and (now - self._rain_observations_at).total_seconds()
            < RAIN_MAP_CACHE_SECONDS
        ):
            return self._rain_observations

        session = async_get_clientsession(self.hass)
        try:
            async with session.get(
                IDOKEP_RAIN_MAP_URL,
                headers={
                    "User-Agent": (
                        "HomeAssistant SmartYardian/0.11 "
                        "(https://github.com/mistenes/smart-yardian)"
                    )
                },
                timeout=15,
            ) as response:
                response.raise_for_status()
                document = await response.text()
        except Exception as err:  # noqa: BLE001
            self.last_rain_error = f"Az Időkép csapadéktérképe nem érhető el: {err}"
            if self._rain_observations:
                return self._rain_observations
            raise WeatherUnavailableError(self.last_rain_error) from err

        observations = parse_idokep_rain_map(document)
        if not observations:
            self.last_rain_error = (
                "Az Időkép csapadéktérképe nem tartalmazott feldolgozható "
                "automataadatot."
            )
            if self._rain_observations:
                return self._rain_observations
            raise WeatherUnavailableError(self.last_rain_error)

        self._rain_observations = observations
        self._rain_observations_at = now
        self.last_rain_error = None
        return observations

    async def async_search_rain_stations(
        self,
        city: str,
    ) -> list[dict[str, Any]]:
        """Return Időkép rain stations matching a settlement name."""
        city = city.strip()
        if len(city) < 2:
            raise ValueError("Adj meg legalább két karaktert a település nevéből.")
        observations = await self._async_rain_observations()
        return [item.as_dict() for item in find_rain_stations(observations, city)]

    async def _async_selected_rain_observation(
        self,
    ) -> RainObservation | None:
        """Return the configured station observation without blocking forecasts."""
        station_id = str(self.store.settings.get("rain_station_id") or "").strip()
        if not station_id:
            self.last_rain_observation = None
            self.last_rain_error = None
            return None
        try:
            observations = await self._async_rain_observations()
        except WeatherUnavailableError:
            return None
        observation = next(
            (item for item in observations if item.station_id == station_id),
            None,
        )
        if observation is None:
            self.last_rain_observation = None
            self.last_rain_error = (
                f"A kiválasztott Időkép automata nem található: {station_id}."
            )
            return None
        self.last_rain_observation = {
            **observation.as_dict(),
            "fetched_at": (
                self._rain_observations_at.isoformat()
                if self._rain_observations_at
                else None
            ),
        }
        self.last_rain_error = None
        return observation

    async def _async_idokep_forecast(self) -> list[ForecastHour]:
        """Fetch normalized hourly data from the configured Időkép entity."""
        weather_entity = self.config[CONF_WEATHER_ENTITY]
        state = self.hass.states.get(weather_entity)
        if state is None:
            raise WeatherUnavailableError("Az Időkép entitás nem érhető el.")
        age = (dt_util.utcnow() - state.last_updated).total_seconds()
        if age > 90 * 60 or state.state in ("unknown", "unavailable"):
            raise WeatherUnavailableError("Az Időkép adata régi vagy nem elérhető.")
        response = await self.hass.services.async_call(
            "weather",
            "get_forecasts",
            {"type": "hourly"},
            target={ATTR_ENTITY_ID: weather_entity},
            blocking=True,
            return_response=True,
        )
        items = (response or {}).get(weather_entity, {}).get("forecast", [])
        forecast = rebase_idokep_timeline(
            normalize_ha_forecast(items),
            dt_util.now(),
        )
        if not forecast:
            raise WeatherUnavailableError(
                "Az Időkép nem adott használható órás előrejelzést."
            )
        return forecast

    async def async_preview_weather(self) -> dict[str, Any]:
        """Return current decision or a structured unavailable response."""
        try:
            return (await self.async_weather_decision()).as_dict()
        except WeatherUnavailableError as err:
            return {
                "factor": None,
                "percent": None,
                "source": "Nincs használható forrás",
                "reason": str(err),
                "available": False,
            }

    async def async_hourly_forecast(self) -> dict[str, Any]:
        """Return the normalized Időkép hourly timeline for the panel."""
        forecast = await self._async_idokep_forecast()
        return {
            "source": "Időkép",
            "generated_at": dt_util.now().isoformat(),
            "hours": [
                {
                    "timestamp": hour.timestamp.isoformat(),
                    "temperature": round(hour.temperature, 1),
                    "precipitation_mm": round(hour.precipitation_mm, 1),
                    "precipitation_probability": round(
                        hour.precipitation_probability
                    ),
                    "condition": hour.condition,
                    "cloud_cover": (
                        round(hour.cloud_cover)
                        if hour.cloud_cover is not None
                        else None
                    ),
                    "is_daylight": hour.is_daylight,
                    "wind_speed_kmh": (
                        round(hour.wind_speed_kmh, 1)
                        if hour.wind_speed_kmh is not None
                        else None
                    ),
                    "wind_gust_kmh": (
                        round(hour.wind_gust_kmh, 1)
                        if hour.wind_gust_kmh is not None
                        else None
                    ),
                    "wind_bearing_deg": (
                        round(hour.wind_bearing_deg)
                        if hour.wind_bearing_deg is not None
                        else None
                    ),
                }
                for hour in forecast
            ],
        }

    async def async_three_day_preview(self) -> dict[str, Any]:
        """Calculate a read-only preview of the next three calendar days."""
        now = dt_util.as_local(dt_util.now())
        occurrences = upcoming_occurrences(self.store.programs, now, days=3)
        days = [
            {
                "date": (now + timedelta(days=offset)).date().isoformat(),
                "programs": [],
            }
            for offset in range(3)
        ]
        days_by_date = {item["date"]: item for item in days}

        idokep_forecast: list[ForecastHour] | None = None
        idokep_error = "Az Időkép nem érhető el."
        try:
            idokep_forecast = await self._async_idokep_forecast()
        except (KeyError, TypeError, ValueError, WeatherUnavailableError) as err:
            idokep_error = str(err)
        rain_observation = await self._async_selected_rain_observation()

        day_decisions: dict[str, WeatherDecision | None] = {}
        day_errors: dict[str, str] = {}

        weather_days: dict[str, datetime] = {}
        for occurrence in occurrences:
            program = occurrence.program
            if (
                program.weather_adjustment
                or program.temperature_condition_enabled
                or any(
                    zone.duration_mode == "reference"
                    for zone in program.zones
                )
                or self._program_uses_wind_guard(program)
            ):
                weather_days.setdefault(
                    occurrence.scheduled_at.date().isoformat(),
                    occurrence.scheduled_at,
                )

        for day_key, scheduled_at in weather_days.items():
            decision: WeatherDecision | None = None
            idokep_day_error = idokep_error

            if idokep_forecast is not None:
                try:
                    decision = evaluate_calendar_day(
                        idokep_forecast,
                        "Időkép",
                        scheduled_at,
                        settings=self.store.settings,
                        observed_precipitation_mm=(
                            rain_observation.measured_mm
                            if rain_observation
                            and scheduled_at.date() == now.date()
                            else 0.0
                        ),
                        rain_station=(
                            f"{rain_observation.location} "
                            f"({rain_observation.station_id})"
                            if rain_observation
                            and scheduled_at.date() == now.date()
                            else None
                        ),
                    )
                except WeatherUnavailableError as err:
                    idokep_day_error = str(err)

            day_decisions[day_key] = decision
            if decision is None:
                day_errors[day_key] = f"Időkép: {idokep_day_error}"

        skip_next_consumed: set[str] = set()

        for occurrence in occurrences:
            program = occurrence.program
            day_key = occurrence.scheduled_at.date().isoformat()
            needs_weather = (
                program.weather_adjustment
                or program.temperature_condition_enabled
                or any(zone.duration_mode == "reference" for zone in program.zones)
                or self._program_uses_wind_guard(program)
            )
            decision = day_decisions.get(day_key) if needs_weather else None
            weather_error = day_errors.get(day_key) if needs_weather else None

            if decision is not None and not program.weather_adjustment:
                decision = replace(
                    decision,
                    factor=1.0,
                    rain_factor=1.0,
                    climate_factor=1.0,
                )

            zones = [
                self._preview_zone(zone, decision, program.weather_adjustment)
                for zone in program.zones
            ]
            planned_minutes = [
                int(zone["planned_minutes"])
                for zone in zones
                if zone["planned_minutes"] is not None
            ]
            wind_assessment: WindAssessment | None = None
            if (
                decision is not None
                and idokep_forecast is not None
                and self._program_uses_wind_guard(program)
                and len(planned_minutes) == len(zones)
            ):
                wind_assessment = find_wind_delay(
                    idokep_forecast,
                    occurrence.scheduled_at,
                    sum(planned_minutes),
                    self._program_head_types(program),
                    self.store.settings,
                )
                decision = self._decision_with_wind(decision, wind_assessment)

            status = "will_run"
            reason = "A jelenlegi számítás szerint a program lefut."

            if not self.store.settings.get("automation_enabled", True):
                status = "automation_off"
                reason = "Az automatika ki van kapcsolva."
            elif self._paused_at(occurrence.scheduled_at):
                status = "paused"
                reason = "Az automatika ekkor még szünetel."
            elif program.skip_next and program.program_id not in skip_next_consumed:
                skip_next_consumed.add(program.program_id)
                status = "skip_next"
                reason = "A következő futás kihagyásra van jelölve."
            elif weather_error:
                status = "weather_unavailable"
                reason = f"Nincs elég megbízható előrejelzés. {weather_error}"
            elif decision and not program.temperature_condition_matches(
                decision.max_temperature
            ):
                status = "condition_skip"
                reason = program.temperature_condition_reason(
                    decision.max_temperature
                )
            elif decision and program.weather_adjustment and decision.factor == 0:
                status = "rain_skip"
                reason = decision.reason
            elif wind_assessment and wind_assessment.action == "delay":
                status = "wind_delayed"
                reason = wind_assessment.reason
            elif wind_assessment and wind_assessment.action == "skip":
                status = (
                    "wind_unavailable"
                    if "Nincs széladat" in wind_assessment.reason
                    else "wind_skip"
                )
                reason = wind_assessment.reason

            item = {
                "program_id": program.program_id,
                "program_name": program.name,
                "scheduled_at": occurrence.scheduled_at.isoformat(),
                "status": status,
                "reason": reason,
                "total_minutes": (
                    sum(planned_minutes)
                    if len(planned_minutes) == len(zones)
                    else None
                ),
                "zones": zones,
                "weather": decision.as_dict() if decision else None,
            }
            days_by_date[occurrence.scheduled_at.date().isoformat()][
                "programs"
            ].append(item)

        return {
            "generated_at": now.isoformat(),
            "days": days,
        }

    def _preview_zone(
        self,
        zone: ProgramZone,
        decision: WeatherDecision | None,
        apply_weather: bool,
    ) -> dict[str, Any]:
        """Calculate one zone without starting hardware."""
        state = self.hass.states.get(zone.entity_id)
        duration: int | None
        if apply_weather and decision is not None and decision.factor == 0:
            duration = 0
        elif zone.duration_mode == "reference":
            duration = (
                reference_duration_minutes(
                    self.zone_profile(zone.entity_id),
                    decision.max_temperature,
                    decision.rain_factor if apply_weather else 1.0,
                )
                if decision
                else None
            )
        elif apply_weather and decision is None:
            duration = None
        else:
            factor = decision.factor if decision and apply_weather else 1.0
            duration = max(1, min(180, round(zone.duration_minutes * factor)))
        return {
            "entity_id": zone.entity_id,
            "name": state.name if state else zone.entity_id,
            "duration_mode": zone.duration_mode,
            "planned_minutes": duration,
        }

    def _paused_at(self, scheduled_at: datetime) -> bool:
        """Return whether a future occurrence is inside the pause window."""
        paused_until = self.store.settings.get("paused_until")
        if not paused_until:
            return False
        try:
            until = datetime.fromisoformat(str(paused_until))
            if until.tzinfo is None:
                until = until.replace(tzinfo=UTC)
            return scheduled_at < until.astimezone(scheduled_at.tzinfo)
        except ValueError:
            return False

    def get_program(self, program_id: str) -> IrrigationProgram:
        """Find a program or raise."""
        for program in self.store.programs:
            if program.program_id == program_id:
                return program
        raise ValueError("A program nem található.")

    async def async_save_program(self, raw: dict[str, Any]) -> IrrigationProgram:
        """Create or update a validated program."""
        program = IrrigationProgram.from_dict(raw)
        unknown = {
            zone.entity_id for zone in program.zones if zone.entity_id not in self.zone_entities
        }
        if unknown:
            raise ValueError(f"Ismeretlen Yardian zóna: {', '.join(sorted(unknown))}")
        for index, current in enumerate(self.store.programs):
            if current.program_id == program.program_id:
                self.store.programs[index] = program
                break
        else:
            self.store.programs.append(program)
        await self.store.async_save()
        self._notify_listeners()
        return program

    def manual_program_from_dict(
        self, raw: dict[str, Any]
    ) -> IrrigationProgram:
        """Validate an ephemeral program without storing it."""
        program = IrrigationProgram.from_dict(raw)
        unknown = {
            zone.entity_id
            for zone in program.zones
            if zone.entity_id not in self.zone_entities
        }
        if unknown:
            raise ValueError(
                f"Ismeretlen Yardian zóna: {', '.join(sorted(unknown))}"
            )
        program.enabled = False
        program.skip_next = False
        return program

    async def async_delete_program(self, program_id: str) -> None:
        """Delete a program."""
        original = len(self.store.programs)
        self.store.programs = [
            program
            for program in self.store.programs
            if program.program_id != program_id
        ]
        if len(self.store.programs) == original:
            raise ValueError("A program nem található.")
        await self.store.async_save()
        self._notify_listeners()

    async def async_skip_next(self, program_id: str) -> None:
        """Mark the next scheduled execution as skipped."""
        self.get_program(program_id).skip_next = True
        await self.store.async_save()
        self._notify_listeners()

    async def async_update_settings(self, settings: dict[str, Any]) -> None:
        """Update safe, non-secret advanced settings."""
        ranges: dict[str, tuple[float, float]] = {
            "rain_skip_mm": (0, 100),
            "rain_skip_probability": (0, 100),
            "rain_skip_probability_mm": (0, 100),
            "rainy_hours_skip": (1, 24),
            "rain_reduce_high_mm": (0, 100),
            "rain_reduce_low_mm": (0, 100),
            "rain_factor_high": (0, 2),
            "rain_factor_low": (0, 2),
            "factor_min": (0, 2),
            "factor_max": (0, 2),
            "wind_delay_step_minutes": (5, 120),
            "wind_speed_threshold_spray": (0, 150),
            "wind_gust_threshold_spray": (0, 180),
            "wind_speed_threshold_rotator": (0, 150),
            "wind_gust_threshold_rotator": (0, 180),
            "wind_speed_threshold_rotor": (0, 150),
            "wind_gust_threshold_rotor": (0, 180),
        }
        candidate = dict(self.store.settings)
        requested_idokep_location: str | None = None
        for key, value in settings.items():
            if key in {
                "notify_mobile",
                "wind_adjustment_enabled",
                "wind_delay_enabled",
            }:
                candidate[key] = bool(value)
                continue
            if key == "wind_delay_until":
                candidate[key] = _validate_clock_time(value, "Szélhalasztás vége")
                continue
            if key in {
                "rain_station_city",
                "rain_station_id",
                "rain_station_name",
            }:
                text = str(value or "").strip()
                if len(text) > 120:
                    raise ValueError(f"Túl hosszú beállítás: {key}")
                candidate[key] = text
                continue
            if key == "idokep_location":
                requested_idokep_location = validate_idokep_location(value)
                candidate[key] = requested_idokep_location
                continue
            if key not in ranges:
                continue
            try:
                number = float(value)
            except (TypeError, ValueError) as err:
                raise ValueError(f"Érvénytelen beállítás: {key}") from err
            minimum, maximum = ranges[key]
            if not minimum <= number <= maximum:
                raise ValueError(f"A(z) {key} értéke {minimum} és {maximum} közé essen.")
            candidate[key] = int(number) if key == "rainy_hours_skip" else number
        if candidate["factor_min"] > candidate["factor_max"]:
            raise ValueError("A minimum szorzó nem lehet nagyobb a maximumnál.")
        if (
            candidate["rain_reduce_low_mm"]
            > candidate["rain_reduce_high_mm"]
        ):
            raise ValueError(
                "Az enyhe eső küszöbe nem lehet nagyobb az erős csökkentés küszöbénél."
            )
        current_location = self._idokep_location()
        if (
            requested_idokep_location is not None
            and requested_idokep_location.casefold()
            != current_location.casefold()
        ):
            await self._async_update_idokep_location(requested_idokep_location)
        self.store.settings = candidate
        await self.store.async_save()
        self._notify_listeners()

    def _idokep_config_entry(self) -> Any:
        """Return the Időkép config entry backing the selected weather entity."""
        weather_entity = str(self.config.get(CONF_WEATHER_ENTITY) or "")
        registry_entry = er.async_get(self.hass).async_get(weather_entity)
        config_entry_id = registry_entry.config_entry_id if registry_entry else None
        config_entry = (
            self.hass.config_entries.async_get_entry(config_entry_id)
            if config_entry_id
            else None
        )
        if config_entry is None or config_entry.domain != "idokep":
            raise ValueError(
                "A kiválasztott weather entitás nem az Időkép integrációhoz tartozik."
            )
        return config_entry

    def _idokep_location(self) -> str:
        """Return the settlement currently configured in Időkép."""
        try:
            entry = self._idokep_config_entry()
        except ValueError:
            return str(self.store.settings.get("idokep_location") or "")
        return str(
            entry.data.get("location_name")
            or self.store.settings.get("idokep_location")
            or ""
        ).strip()

    async def _async_update_idokep_location(self, location: str) -> None:
        """Validate and reconfigure the selected Időkép integration entry."""
        session = async_get_clientsession(self.hass)
        url = f"https://www.idokep.hu/elorejelzes/{quote(location, safe='')}"
        try:
            async with session.get(
                url,
                headers={
                    "User-Agent": (
                        "HomeAssistant SmartYardian/0.13 "
                        "(https://github.com/mistenes/smart-yardian)"
                    )
                },
                timeout=15,
            ) as response:
                response.raise_for_status()
                document = await response.text()
        except Exception as err:  # noqa: BLE001
            raise ValueError(
                f"Az Időkép település-ellenőrzése nem sikerült: {err}"
            ) from err
        if "wide-hourly-forecast-card" not in document:
            raise ValueError(
                f"Az Időkép nem adott órás előrejelzést ehhez: {location}."
            )

        entry = self._idokep_config_entry()
        old_data = dict(entry.data)
        new_data = {**old_data, "location_name": location}
        self.hass.config_entries.async_update_entry(entry, data=new_data)
        try:
            await self.hass.config_entries.async_reload(entry.entry_id)
        except Exception as err:  # noqa: BLE001
            self.hass.config_entries.async_update_entry(entry, data=old_data)
            await self.hass.config_entries.async_reload(entry.entry_id)
            raise ValueError(
                "Az Időkép integráció nem tudott átállni az új településre."
            ) from err

    def zone_profile(self, entity_id: str) -> ZoneProfile:
        """Return a configured profile or a safe in-memory default."""
        return self.store.zone_profiles.get(entity_id) or ZoneProfile.default(entity_id)

    async def async_update_zone_profiles(
        self, profiles: list[dict[str, Any]]
    ) -> None:
        """Validate and persist hydraulic profiles for configured zones."""
        updated = dict(self.store.zone_profiles)
        for raw in profiles:
            profile = ZoneProfile.from_dict(raw)
            if profile.entity_id not in self.zone_entities:
                raise ValueError(f"Ismeretlen Yardian zóna: {profile.entity_id}")
            updated[profile.entity_id] = profile
        self.store.zone_profiles = updated
        await self.store.async_save()
        self._notify_listeners()

    async def async_run_program(
        self,
        program: IrrigationProgram,
        scheduled_at: datetime | None = None,
        apply_weather: bool | None = None,
        *,
        allow_wind_delay: bool = False,
        run_key: str | None = None,
        original_scheduled_at: datetime | None = None,
    ) -> None:
        """Run every zone safely under one global lock."""
        scheduled_at = scheduled_at or dt_util.now()
        original_scheduled_at = original_scheduled_at or scheduled_at
        apply_weather = (
            program.weather_adjustment if apply_weather is None else apply_weather
        )
        run_id = str(uuid4())
        uses_reference = any(
            zone.duration_mode == "reference" for zone in program.zones
        )
        uses_temperature_condition = program.temperature_condition_enabled
        uses_wind_guard = self._program_uses_wind_guard(program)

        lock_acquired = False
        try:
            try:
                # The timeout limits queueing only. A valid irrigation program may
                # itself run for much longer than 30 minutes.
                async with asyncio.timeout(MAX_QUEUE_DELAY_SECONDS):
                    await self._run_lock.acquire()
                    lock_acquired = True
                    await self._async_wait_for_external_irrigation()
            except TimeoutError:
                await self._async_record_skip(
                    program,
                    scheduled_at,
                    "A rendszer 30 percnél tovább volt foglalt.",
                )
                return

            decision = (
                await self.async_weather_decision(scheduled_at)
                if apply_weather or uses_reference or uses_temperature_condition
                else WeatherDecision(
                    factor=1.0,
                    source=(
                        "Időkép szélkorrekció"
                        if uses_wind_guard and allow_wind_delay
                        else "Kézi, korrekció nélkül"
                    ),
                    precipitation_mm=0,
                    max_probability=0,
                    max_temperature=0,
                    sunny_hours=0,
                    rainy_hours=0,
                    reason=(
                        "A program időjárás-korrekció nélkül fut, de a "
                        "szélbiztonság ellenőrzése aktív."
                        if uses_wind_guard and allow_wind_delay
                        else "A program kézi, időjárás-korrekció nélküli futás."
                    ),
                    evaluated_at=dt_util.utcnow(),
                )
            )
            if not apply_weather and (
                uses_reference or uses_temperature_condition
            ):
                reason_parts = []
                if uses_reference:
                    reason_parts.append(
                        "referenciaidő az előrejelzett hőmérsékletből"
                    )
                if uses_temperature_condition:
                    reason_parts.append("hőmérséklet-feltétel ellenőrizve")
                decision = replace(
                    decision,
                    factor=1.0,
                    rain_factor=1.0,
                    climate_factor=1.0,
                    reason=f"{', '.join(reason_parts).capitalize()}, "
                    "esőkorrekció nélkül.",
                )
            if not program.temperature_condition_matches(
                decision.max_temperature
            ):
                await self._async_record_skip(
                    program,
                    scheduled_at,
                    program.temperature_condition_reason(
                        decision.max_temperature
                    ),
                    decision,
                )
                return
            if decision.factor == 0:
                await self._async_record_skip(
                    program, scheduled_at, decision.reason, decision
                )
                return
            if uses_wind_guard and (allow_wind_delay or apply_weather):
                try:
                    forecast = await self._async_idokep_forecast()
                    wind_assessment = find_wind_delay(
                        forecast,
                        scheduled_at,
                        self._planned_program_minutes(program, decision),
                        self._program_head_types(program),
                        self.store.settings,
                    )
                except WeatherUnavailableError as err:
                    if allow_wind_delay:
                        await self._async_record_skip(
                            program,
                            scheduled_at,
                            f"Széladat hiányzik: {err}",
                            self._decision_with_wind(
                                decision,
                                WindAssessment(
                                    "skip",
                                    f"Széladat hiányzik: {err}",
                                ),
                            ),
                        )
                        return
                else:
                    if (
                        allow_wind_delay
                        and wind_assessment.action == "delay"
                        and wind_assessment.delayed_until is not None
                    ):
                        decision = self._decision_with_wind(decision, wind_assessment)
                        await self._async_schedule_wind_delay(
                            program,
                            original_scheduled_at,
                            scheduled_at,
                            wind_assessment,
                            run_key,
                        )
                        return
                    if allow_wind_delay and wind_assessment.action == "skip":
                        await self._async_record_skip(
                            program,
                            scheduled_at,
                            wind_assessment.reason,
                            self._decision_with_wind(decision, wind_assessment),
                        )
                        return
                    if wind_assessment.action in {"delay", "skip"}:
                        wind_assessment = WindAssessment(
                            "warn",
                            wind_assessment.reason,
                            wind_assessment.max_wind_speed_kmh,
                            wind_assessment.max_wind_gust_kmh,
                            wind_assessment.windy_hours,
                        )
                    decision = self._decision_with_wind(decision, wind_assessment)
            await self._async_execute_program(
                run_id, program, scheduled_at, decision
            )
        except WeatherUnavailableError as err:
            await self._async_record_skip(
                program,
                scheduled_at,
                f"Bizonytalan időjárási adat: {err}",
            )
        finally:
            if lock_acquired:
                self._run_lock.release()

    def _program_uses_wind_guard(self, program: IrrigationProgram) -> bool:
        """Return whether wind can affect this program."""
        return bool(
            self.store.settings.get("wind_adjustment_enabled", True)
            and any(head_type != "drip" for head_type in self._program_head_types(program))
        )

    def _program_head_types(self, program: IrrigationProgram) -> list[str]:
        """Return the configured head type of every zone in a program."""
        return [
            self.zone_profile(zone.entity_id).head_type
            for zone in program.zones
        ]

    def _planned_program_minutes(
        self,
        program: IrrigationProgram,
        decision: WeatherDecision,
    ) -> int:
        """Calculate the program length used for wind-window checks."""
        return sum(
            int(self._zone_run_details(zone, decision)["planned_minutes"])
            for zone in program.zones
        )

    @staticmethod
    def _decision_with_wind(
        decision: WeatherDecision,
        assessment: WindAssessment,
    ) -> WeatherDecision:
        """Attach a program-window wind assessment to a weather decision."""
        return replace(
            decision,
            max_wind_speed_kmh=assessment.max_wind_speed_kmh,
            max_wind_gust_kmh=assessment.max_wind_gust_kmh,
            windy_hours=assessment.windy_hours,
            wind_action=assessment.action,
            wind_reason=assessment.reason,
            delayed_until=assessment.delayed_until,
        )

    async def _async_schedule_wind_delay(
        self,
        program: IrrigationProgram,
        original_scheduled_at: datetime,
        scheduled_at: datetime,
        assessment: WindAssessment,
        run_key: str | None,
    ) -> None:
        """Persist a wind-delayed run for a later same-day minute tick."""
        if assessment.delayed_until is None:
            return
        key = run_key or (
            f"{program.program_id}:{original_scheduled_at.date().isoformat()}:"
            f"{program.start_time}"
        )
        delayed_runs = [
            item
            for item in list(self.store.runtime.get("delayed_runs") or [])
            if item.get("run_key") != key
        ]
        delayed_runs.append(
            {
                "run_key": key,
                "program_id": program.program_id,
                "program_name": program.name,
                "original_scheduled_at": original_scheduled_at.isoformat(),
                "scheduled_at": assessment.delayed_until.isoformat(),
                "previous_scheduled_at": scheduled_at.isoformat(),
                "reason": assessment.reason,
                "created_at": dt_util.utcnow().isoformat(),
            }
        )
        self.store.runtime["delayed_runs"] = sorted(
            delayed_runs,
            key=lambda item: str(item.get("scheduled_at") or ""),
        )
        await self.store.async_save()
        await self.async_notify(
            (
                f"{program.name} {scheduled_at.strftime('%H:%M')} helyett "
                f"{assessment.delayed_until.strftime('%H:%M')}-kor próbál újra. "
                f"{assessment.reason}"
            ),
            "Öntözés szél miatt halasztva",
        )
        self._notify_listeners()

    async def _async_execute_program(
        self,
        run_id: str,
        program: IrrigationProgram,
        scheduled_at: datetime,
        decision: WeatherDecision,
    ) -> None:
        """Execute the program while holding the run lock."""
        self._stop_event.clear()
        self._skip_zone_event.clear()
        started = dt_util.utcnow()
        zone_results = [
            self._zone_run_details(zone, decision) for zone in program.zones
        ]
        total_minutes = sum(
            int(item["planned_minutes"]) for item in zone_results
        )
        self.status = "running"
        self.last_error = None
        self.active_run = {
            "run_id": run_id,
            "program_id": program.program_id,
            "program_name": program.name,
            "scheduled_at": scheduled_at.isoformat(),
            "started_at": started.isoformat(),
            "factor": decision.factor,
            "weather_source": decision.source,
            "weather": decision.as_dict(),
            "zones": zone_results,
            "total_minutes": total_minutes,
            "completed_minutes": 0,
        }
        self.store.runtime["active_run"] = self.active_run
        await self.store.async_save()
        self._notify_listeners()

        outcome = "completed"
        reason = decision.reason
        try:
            for index, (zone, result) in enumerate(
                zip(program.zones, zone_results, strict=True)
            ):
                if self._stop_event.is_set():
                    outcome = "stopped"
                    reason = "A futást a felhasználó leállította."
                    break
                duration = int(result["planned_minutes"])
                result["outcome"] = "running"
                self._skip_zone_event.clear()
                self.active_run["current_zone"] = zone.entity_id
                self.active_run["current_duration"] = duration
                self.active_run["current_index"] = index
                self.active_run["zone_started_at"] = dt_util.utcnow().isoformat()
                self.active_run["zone_ends_at"] = (
                    dt_util.utcnow() + timedelta(minutes=duration)
                ).isoformat()
                await self.store.async_save()
                self._notify_listeners()
                await self._async_start_zone(zone.entity_id, duration)
                wait_outcome = await self._async_wait_duration(duration)
                await self._async_stop_zone(zone.entity_id)
                result["outcome"] = wait_outcome
                if wait_outcome == "stopped":
                    outcome = "stopped"
                    reason = "A futást a felhasználó leállította."
                    break
                self.active_run["completed_minutes"] = (
                    int(self.active_run["completed_minutes"]) + duration
                )
                await self.store.async_save()
                self._notify_listeners()
        except Exception as err:  # noqa: BLE001 - device failures must become audit records
            _LOGGER.exception("Smart Yardian run failed")
            outcome = "failed"
            reason = str(err)
            self.status = "error"
            self.last_error = reason
            await self.async_stop_all()
            await self.async_notify(reason, "Öntözési hiba")
        finally:
            completed = dt_util.utcnow()
            record = RunRecord(
                run_id=run_id,
                program_id=program.program_id,
                program_name=program.name,
                scheduled_at=scheduled_at.isoformat(),
                started_at=started.isoformat(),
                completed_at=completed.isoformat(),
                outcome=outcome,
                reason=reason,
                factor=decision.factor,
                weather_source=decision.source,
                zones=zone_results,
                weather=decision.as_dict(),
            )
            self.store.runtime.pop("active_run", None)
            await self.store.async_add_history(record.as_dict())
            self.active_run = None
            if self.status != "error":
                self.status = "idle"
            self._notify_listeners()

    def _zone_run_details(
        self,
        zone: ProgramZone,
        decision: WeatherDecision,
    ) -> dict[str, Any]:
        """Build one planned zone result before program execution."""
        if zone.duration_mode == "reference":
            profile = self.zone_profile(zone.entity_id)
            target = seasonal_target(decision.max_temperature)
            duration = reference_duration_minutes(
                profile,
                decision.max_temperature,
                decision.rain_factor,
            )
            base_minutes = reference_duration_minutes(
                profile,
                decision.max_temperature,
            )
            calculation = {
                "duration_mode": "reference",
                "head_type": profile.head_type,
                "exposure": profile.exposure,
                "exposure_factor": profile.exposure_factor,
                "application_rate_mm_h": round(profile.effective_rate_mm_h, 2),
                "rate_source": profile.rate_source,
                "target_mm": target.depth_mm,
                "rain_factor": decision.rain_factor,
            }
        else:
            duration = max(
                1, min(180, round(zone.duration_minutes * decision.factor))
            )
            base_minutes = zone.duration_minutes
            calculation = {"duration_mode": "manual"}
        state = self.hass.states.get(zone.entity_id)
        return {
            "entity_id": zone.entity_id,
            "name": state.name if state else zone.entity_id,
            "base_minutes": base_minutes,
            "planned_minutes": duration,
            "outcome": "pending",
            **calculation,
        }

    async def async_run_manual_zone(self, entity_id: str, duration: int) -> None:
        """Run one exact-duration zone using the same global safety lock."""
        if entity_id not in self.zone_entities:
            raise ValueError("Ismeretlen Yardian zóna.")
        if not 1 <= duration <= 180:
            raise ValueError("Az időtartam 1 és 180 perc közötti lehet.")
        program = IrrigationProgram(
            name="Kézi zónaindítás",
            weekdays=[dt_util.now().weekday()],
            start_time=dt_util.now().strftime("%H:%M"),
            zones=[],
            weather_adjustment=False,
        )
        # ProgramZone validation is intentionally bypassed only after direct validation.
        from .models import ProgramZone  # local import avoids a circular type-only dependency

        program.zones = [ProgramZone(entity_id, duration, "manual")]
        await self.async_run_program(program, apply_weather=False)

    async def _async_start_zone(self, entity_id: str, duration: int) -> None:
        state = self.hass.states.get(entity_id)
        if state is None or state.state in UNAVAILABLE_STATES:
            raise RuntimeError(f"A zóna nem érhető el: {entity_id}")
        await self.hass.services.async_call(
            "yardian",
            "start_irrigation",
            {"duration": duration},
            target={ATTR_ENTITY_ID: entity_id},
            blocking=True,
        )
        if not await self._async_wait_state(entity_id, True, START_CONFIRM_SECONDS):
            state = self.hass.states.get(entity_id)
            observed_state = state.state if state is not None else "missing"
            raise RuntimeError(
                "A zóna nem igazolta vissza az indítást "
                f"{START_CONFIRM_SECONDS} másodpercen belül: {entity_id} "
                f"(utolsó HA állapot: {observed_state})"
            )

    async def _async_stop_zone(self, entity_id: str) -> None:
        await self.hass.services.async_call(
            "homeassistant",
            "turn_off",
            {},
            target={ATTR_ENTITY_ID: entity_id},
            blocking=True,
        )
        if not await self._async_wait_state(entity_id, False, STOP_CONFIRM_SECONDS):
            raise RuntimeError(f"A zóna nem igazolta vissza a leállást: {entity_id}")

    async def _async_wait_state(
        self, entity_id: str, expected_on: bool, timeout_seconds: int
    ) -> bool:
        deadline = asyncio.get_running_loop().time() + timeout_seconds
        next_refresh = asyncio.get_running_loop().time() + 5
        while asyncio.get_running_loop().time() < deadline:
            state = self.hass.states.get(entity_id)
            if (
                state is not None
                and state.state not in UNAVAILABLE_STATES
                and (state.state == STATE_ON) == expected_on
            ):
                return True
            if asyncio.get_running_loop().time() >= next_refresh:
                try:
                    await self.hass.services.async_call(
                        "homeassistant",
                        "update_entity",
                        {},
                        target={ATTR_ENTITY_ID: entity_id},
                        blocking=False,
                    )
                except Exception:  # noqa: BLE001
                    _LOGGER.debug(
                        "Could not request an immediate state refresh for %s",
                        entity_id,
                        exc_info=True,
                    )
                next_refresh = asyncio.get_running_loop().time() + 5
            await asyncio.sleep(1)
        return False

    async def _async_wait_duration(self, duration_minutes: int) -> str:
        stop_task = asyncio.create_task(self._stop_event.wait())
        skip_task = asyncio.create_task(self._skip_zone_event.wait())
        done, pending = await asyncio.wait(
            {stop_task, skip_task},
            timeout=duration_minutes * 60,
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
        if not done:
            return "completed"
        if stop_task in done and stop_task.result():
            return "stopped"
        return "skipped"

    async def _async_wait_for_external_irrigation(self) -> None:
        deadline = asyncio.get_running_loop().time() + MAX_QUEUE_DELAY_SECONDS
        while any(
            (state := self.hass.states.get(entity_id)) is not None
            and state.state == STATE_ON
            for entity_id in self.zone_entities
        ):
            if asyncio.get_running_loop().time() >= deadline:
                raise TimeoutError
            await asyncio.sleep(2)

    async def async_stop_all(self) -> None:
        """Stop every active configured Yardian zone."""
        self._stop_event.set()
        active = {
            entity_id
            for entity_id in self.zone_entities
            if (state := self.hass.states.get(entity_id)) is not None
            and state.state == STATE_ON
        }
        if self.active_run and self.active_run.get("current_zone"):
            active.add(str(self.active_run["current_zone"]))
        if active:
            await self.hass.services.async_call(
                "homeassistant",
                "turn_off",
                {},
                target={ATTR_ENTITY_ID: sorted(active)},
                blocking=True,
            )
        self._notify_listeners()

    async def async_skip_current_zone(self) -> None:
        """Stop only the current zone and continue with the next one."""
        if not self.active_run or not self.active_run.get("current_zone"):
            raise ValueError("Nincs kihagyható, aktív öntözési kör.")
        self._skip_zone_event.set()
        self._notify_listeners()

    async def _async_record_skip(
        self,
        program: IrrigationProgram,
        scheduled_at: datetime,
        reason: str,
        decision: WeatherDecision | None = None,
    ) -> None:
        record = RunRecord(
            run_id=str(uuid4()),
            program_id=program.program_id,
            program_name=program.name,
            scheduled_at=scheduled_at.isoformat(),
            started_at=None,
            completed_at=dt_util.utcnow().isoformat(),
            outcome="skipped",
            reason=reason,
            factor=decision.factor if decision else 0,
            weather_source=decision.source if decision else "nem elérhető",
            zones=[],
            weather=decision.as_dict() if decision else None,
        )
        await self.store.async_add_history(record.as_dict())
        await self.async_notify(reason, f"{program.name} kihagyva")
        self._notify_listeners()

    async def async_notify(self, message: str, title: str) -> None:
        """Create a persistent notification and optional mobile notification."""
        persistent_notification.async_create(
            self.hass,
            message,
            title=title,
            notification_id=f"{DOMAIN}_{self.entry_id}",
        )
        notify_service = str(self.config.get(CONF_NOTIFY_SERVICE) or "").strip()
        if (
            notify_service
            and self.store.settings.get("notify_mobile", True)
            and "." in notify_service
        ):
            domain, service = notify_service.split(".", 1)
            try:
                await self.hass.services.async_call(
                    domain,
                    service,
                    {"title": title, "message": message},
                    blocking=False,
                )
            except Exception:  # noqa: BLE001
                _LOGGER.warning("Could not send mobile irrigation notification")

    def next_run(self, now: datetime | None = None) -> datetime | None:
        """Return the next enabled program occurrence."""
        now = dt_util.as_local(now or dt_util.now())
        candidates: list[datetime] = []
        for item in self.store.runtime.get("delayed_runs") or []:
            delayed_at = _parse_runtime_datetime(item.get("scheduled_at"), None)
            if delayed_at is not None:
                delayed_at = delayed_at.astimezone(now.tzinfo)
                if delayed_at > now:
                    candidates.append(delayed_at)
        for offset in range(8):
            date = (now + timedelta(days=offset)).date()
            for program in self.store.programs:
                if not program.enabled or date.weekday() not in program.weekdays:
                    continue
                hour, minute = (int(part) for part in program.start_time.split(":"))
                candidate = datetime.combine(date, datetime.min.time()).replace(
                    hour=hour,
                    minute=minute,
                    tzinfo=now.tzinfo,
                )
                if candidate > now:
                    candidates.append(candidate)
        return min(candidates) if candidates else None

    def summary(self) -> dict[str, Any]:
        """Build one frontend-safe snapshot."""
        entity_registry = er.async_get(self.hass)
        device_registry = dr.async_get(self.hass)
        controllers: dict[str, dict[str, Any]] = {}
        for index, entity_id in enumerate(self.zone_entities):
            state = self.hass.states.get(entity_id)
            entry = entity_registry.async_get(entity_id)
            device_id = entry.device_id if entry else None
            device = device_registry.async_get(device_id) if device_id else None
            controller_key = device_id or f"controller-{index}"
            controller = controllers.setdefault(
                controller_key,
                {
                    "id": controller_key,
                    "name": (
                        (device.name_by_user or device.name)
                        if device
                        else "Yardian vezérlő"
                    ),
                    "model": device.model if device else "Yardian",
                    "available": False,
                    "available_zone_count": 0,
                    "zone_count": 0,
                    "zones": [],
                },
            )
            state_value = state.state if state else "missing"
            available = state is not None and state_value not in UNAVAILABLE_STATES
            profile = self.zone_profile(entity_id)
            profile_data = profile.as_dict()
            if profile.moisture_sensor_entity_id:
                moisture_state = self.hass.states.get(
                    profile.moisture_sensor_entity_id
                )
                profile_data["moisture_sensor_state"] = (
                    moisture_state.state if moisture_state else "unavailable"
                )
                profile_data["moisture_sensor_unit"] = (
                    moisture_state.attributes.get("unit_of_measurement")
                    if moisture_state
                    else None
                )
            zone = {
                "entity_id": entity_id,
                "name": state.name if state else entity_id,
                "state": state_value,
                "available": available,
                "availability_issue": self._zone_availability_issue(
                    entity_id, state_value
                ),
                "profile": profile_data,
            }
            controller["zones"].append(zone)
            controller["zone_count"] += 1
            if available:
                controller["available_zone_count"] += 1

        for controller in controllers.values():
            controller["available"] = controller["available_zone_count"] > 0

        next_run = self.next_run()
        weather_decision = self.last_decision
        if weather_decision and not is_plausible_celsius(
            weather_decision.max_temperature
        ):
            weather_decision = None
        target = (
            seasonal_target(weather_decision.max_temperature).as_dict()
            if weather_decision
            else None
        )
        settings = dict(self.store.settings)
        settings["idokep_location"] = self._idokep_location()
        settings["ntfy_link"] = ntfy_link(settings)
        return {
            "status": self.status,
            "automation_enabled": self.store.settings.get("automation_enabled", True),
            "paused_until": self.store.settings.get("paused_until"),
            "controllers": list(controllers.values()),
            "programs": [program.as_dict() for program in self.store.programs],
            "history": list(reversed(self.store.history[-20:])),
            "settings": settings,
            "active_run": self.active_run,
            "weather": weather_decision.as_dict() if weather_decision else None,
            "rain_observation": self.last_rain_observation,
            "rain_observation_error": self.last_rain_error,
            "last_error": self.last_error,
            "next_run": next_run.isoformat() if next_run else None,
            "seasonal_target": target,
        }

    @staticmethod
    def _zone_availability_issue(entity_id: str, state: str) -> str | None:
        """Return a user-facing diagnostic for unavailable zone entities."""
        if state == "missing":
            return f"Nincs aktív HA state ehhez az entityhez: {entity_id}"
        if state == "unavailable":
            return f"A natív Yardian switch unavailable állapotban van: {entity_id}"
        return None


def _parse_runtime_datetime(
    value: Any,
    default: datetime | None,
) -> datetime | None:
    """Parse a persisted runtime timestamp."""
    try:
        parsed = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return default
    if parsed.tzinfo is None and default is not None:
        parsed = parsed.replace(tzinfo=default.tzinfo)
    return parsed


def _validate_clock_time(value: Any, label: str) -> str:
    """Validate and normalize a HH:MM setting."""
    try:
        hour, minute = (int(part) for part in str(value or "").split(":", 1))
    except (TypeError, ValueError) as err:
        raise ValueError(f"{label} HH:MM formátumú legyen.") from err
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(f"{label} érvénytelen időpont.")
    return f"{hour:02d}:{minute:02d}"
