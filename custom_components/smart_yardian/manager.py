"""Runtime manager and safe irrigation scheduler."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from math import ceil
from typing import Any
from urllib.parse import quote
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
    IDOKEP_FORECAST_LEAD_SECONDS,
    IDOKEP_FORECAST_PRIME_SECONDS,
    IDOKEP_FORECAST_RETRY_SECONDS,
    IDOKEP_WIND_CACHE_SECONDS,
    MAX_QUEUE_DELAY_SECONDS,
    RAIN_MAP_CACHE_SECONDS,
    START_CONFIRM_SECONDS,
    STOP_CONFIRM_SECONDS,
)
from .idokep_wind import (
    IDOKEP_FORECAST_URL,
    IdokepWindHour,
    merge_idokep_hourly_wind,
    parse_idokep_hourly_wind,
)
from .irrigation import (
    ZoneProfile,
    reference_duration_for_depth,
    reference_duration_minutes,
    seasonal_target,
)
from .models import ForecastHour, IrrigationProgram, ProgramZone, RunRecord, WeatherDecision
from .ntfy import ntfy_link
from .planning import (
    ProgramOccurrence,
    SmartSlotChoice,
    select_smart_watering_slot,
    upcoming_occurrences,
)
from .rainfall import (
    IDOKEP_RAIN_MAP_URL,
    RainObservation,
    find_rain_stations,
    parse_idokep_rain_map,
)
from .soil_moisture import (
    adjust_duration_for_soil_moisture,
    assess_soil_moisture,
)
from .storage import SmartYardianStore
from .weather import (
    WeatherUnavailableError,
    WindAssessment,
    evaluate_calendar_day,
    find_wind_delay,
    is_plausible_celsius,
    merge_hourly_forecast_snapshots,
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
        self._idokep_wind_hours: list[IdokepWindHour] = []
        self._idokep_wind_attempted_at: datetime | None = None
        self._idokep_wind_error: str | None = None
        self._idokep_forecast_snapshot: list[ForecastHour] = []
        self._idokep_forecast_attempted_at: datetime | None = None
        self._idokep_forecast_refreshed_at: datetime | None = None
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
        recovered_claims = self._recover_delayed_claims(self.store.runtime.get("active_run"))
        added_profiles = False
        for entity_id in self.zone_entities:
            if entity_id not in self.store.zone_profiles:
                self.store.zone_profiles[entity_id] = ZoneProfile.default(entity_id)
                added_profiles = True
        if added_profiles or generated_settings or recovered_claims:
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
        self._create_task(
            self._async_prime_idokep_forecast(dt_util.as_local(dt_util.now())),
            f"{DOMAIN}_forecast_prime",
        )

    def _recover_delayed_claims(
        self,
        interrupted: dict[str, Any] | None,
    ) -> bool:
        """Release stale task claims and discard an interrupted active claim."""
        delayed_runs = list(self.store.runtime.get("delayed_runs") or [])
        if not delayed_runs:
            return False
        interrupted_key = str((interrupted or {}).get("run_key") or "")
        interrupted_program = str((interrupted or {}).get("program_id") or "")
        recovered: list[dict[str, Any]] = []
        changed = False
        for raw in delayed_runs:
            item = dict(raw)
            if not item.get("claim_id"):
                recovered.append(item)
                continue
            same_interrupted_run = bool(
                interrupted
                and (
                    (interrupted_key and item.get("run_key") == interrupted_key)
                    or (
                        not interrupted_key
                        and interrupted_program
                        and item.get("program_id") == interrupted_program
                    )
                )
            )
            changed = True
            if same_interrupted_run:
                continue
            item.pop("claim_id", None)
            item.pop("claimed_at", None)
            recovered.append(item)
        if changed:
            self.store.runtime["delayed_runs"] = recovered
        return changed

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
        self._create_task(
            self._async_prime_idokep_forecast(local_now),
            f"{DOMAIN}_forecast_prime_{int(local_now.timestamp())}",
        )
        executed = self.store.runtime.setdefault("executed", [])
        if len(executed) > 500:
            executed[:] = executed[-250:]
        await self._async_run_due_delayed(local_now, executed)

        for program in self.store.programs:
            occurrence = self._due_program_occurrence(program, local_now)
            if occurrence is None:
                continue
            run_key = self._program_run_key(occurrence)
            if run_key in executed:
                continue
            if any(
                str(item.get("run_key") or "") == run_key
                for item in self.store.runtime.get("delayed_runs") or []
            ):
                executed.append(run_key)
                await self.store.async_save()
                continue
            if program.skip_next:
                executed.append(run_key)
                program.skip_next = False
                await self.store.async_save()
                await self._async_record_skip(
                    program,
                    local_now,
                    "A következő futást a felhasználó kihagyta.",
                )
                continue
            if program.schedule_mode == "smart_window":
                claim_id = self._claim_smart_occurrence(
                    occurrence,
                    local_now,
                    run_key,
                )
                executed.append(run_key)
                await self.store.async_save()
                self._create_task(
                    self._async_run_claimed_delayed(
                        program,
                        local_now,
                        run_key,
                        claim_id,
                        occurrence.scheduled_at,
                        occurrence.window_end_at,
                    ),
                    f"{DOMAIN}_smart_{program.program_id}",
                )
                continue
            executed.append(run_key)
            await self.store.async_save()
            self._create_task(
                self.async_run_program(
                    program,
                    local_now,
                    allow_wind_delay=True,
                    run_key=run_key,
                    original_scheduled_at=occurrence.scheduled_at,
                    window_end_at=occurrence.window_end_at,
                ),
                f"{DOMAIN}_program_{program.program_id}",
            )

    def _claim_smart_occurrence(
        self,
        occurrence: ProgramOccurrence,
        evaluated_at: datetime,
        run_key: str,
    ) -> str:
        """Persist a recoverable smart planning claim before task creation."""
        claim_id = str(uuid4())
        delayed_runs = [
            item
            for item in list(self.store.runtime.get("delayed_runs") or [])
            if str(item.get("run_key") or "") != run_key
        ]
        delayed_runs.append(
            {
                "kind": "smart_window",
                "run_key": run_key,
                "claim_id": claim_id,
                "claimed_at": dt_util.utcnow().isoformat(),
                "program_id": occurrence.program.program_id,
                "program_name": occurrence.program.name,
                "original_scheduled_at": occurrence.scheduled_at.isoformat(),
                "scheduled_at": evaluated_at.isoformat(),
                "window_end_at": (
                    occurrence.window_end_at.isoformat() if occurrence.window_end_at else None
                ),
                "planning_status": "smart_waiting_forecast",
                "selection_reason": "Az intelligens kezdési idő számítása folyamatban.",
                "created_at": dt_util.utcnow().isoformat(),
            }
        )
        self.store.runtime["delayed_runs"] = sorted(
            delayed_runs,
            key=lambda item: str(item.get("scheduled_at") or ""),
        )
        return claim_id

    def _due_program_occurrence(
        self,
        program: IrrigationProgram,
        local_now: datetime,
    ) -> ProgramOccurrence | None:
        """Return the fixed minute or currently open smart service window."""
        if not program.enabled:
            return None
        occurrences = upcoming_occurrences(
            [program],
            local_now - timedelta(minutes=1),
            days=1,
        )
        for occurrence in occurrences:
            if program.schedule_mode == "fixed":
                if occurrence.scheduled_at == local_now:
                    return occurrence
                continue
            if (
                occurrence.window_start_at is not None
                and occurrence.window_end_at is not None
                and (
                    occurrence.window_start_at <= local_now < occurrence.window_end_at
                    or (
                        occurrence.window_start_at == occurrence.window_end_at
                        and local_now == occurrence.window_start_at
                    )
                )
            ):
                return occurrence
        return None

    @staticmethod
    def _program_run_key(occurrence: ProgramOccurrence) -> str:
        """Return a stable key that does not change when a smart start moves."""
        program = occurrence.program
        service_date = occurrence.service_date or occurrence.scheduled_at.date()
        if program.schedule_mode == "smart_window":
            return f"{program.program_id}:{service_date.isoformat()}:smart_window"
        return f"{program.program_id}:{service_date.isoformat()}:{program.start_time}"

    async def _async_prime_idokep_forecast(self, local_now: datetime) -> None:
        """Capture wind shortly before a run so the current hour is retained."""
        if not self.automation_available(local_now):
            return
        if not self._wind_forecast_needed_soon(local_now):
            return
        utc_now = dt_util.utcnow()
        if (
            self._idokep_forecast_refreshed_at is not None
            and (utc_now - self._idokep_forecast_refreshed_at).total_seconds()
            < IDOKEP_FORECAST_PRIME_SECONDS
        ):
            return
        if (
            self._idokep_forecast_attempted_at is not None
            and (utc_now - self._idokep_forecast_attempted_at).total_seconds()
            < IDOKEP_FORECAST_RETRY_SECONDS
        ):
            return
        self._idokep_forecast_attempted_at = utc_now
        try:
            await self._async_idokep_forecast()
        except WeatherUnavailableError as err:
            _LOGGER.debug("Időkép forecast prefetch unavailable: %s", err)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Időkép forecast prefetch failed unexpectedly")

    def _wind_forecast_needed_soon(self, local_now: datetime) -> bool:
        """Return whether a regular or delayed overhead run is due soon."""
        horizon = local_now + timedelta(seconds=IDOKEP_FORECAST_LEAD_SECONDS)
        planning_now = local_now - timedelta(minutes=1)
        for occurrence in upcoming_occurrences(
            self.store.programs,
            planning_now,
            days=2,
        ):
            if occurrence.scheduled_at > horizon:
                break
            if occurrence.program.schedule_mode == "smart_window" or self._program_uses_wind_guard(
                occurrence.program
            ):
                return True

        for item in self.store.runtime.get("delayed_runs") or []:
            try:
                delayed_at = datetime.fromisoformat(str(item["scheduled_at"]))
                if delayed_at.tzinfo is None:
                    delayed_at = delayed_at.replace(tzinfo=local_now.tzinfo)
                delayed_at = delayed_at.astimezone(local_now.tzinfo)
                program = self.get_program(str(item["program_id"]))
            except (KeyError, TypeError, ValueError):
                continue
            if planning_now < delayed_at <= horizon and (
                program.schedule_mode == "smart_window" or self._program_uses_wind_guard(program)
            ):
                return True
        return False

    async def _async_run_due_delayed(
        self,
        local_now: datetime,
        executed: list[str],
    ) -> None:
        """Claim and start persisted delayed runs that are due."""
        delayed_runs = list(self.store.runtime.get("delayed_runs") or [])
        if not delayed_runs:
            return
        remaining: list[dict[str, Any]] = []
        claimed: list[
            tuple[
                IrrigationProgram,
                str,
                str,
                datetime,
                datetime | None,
            ]
        ] = []
        changed = False
        for raw in delayed_runs:
            item = dict(raw)
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

            if item.get("claim_id"):
                remaining.append(item)
                continue
            if delayed_at > local_now:
                remaining.append(item)
                continue

            window_end_at = _parse_runtime_datetime(
                item.get("window_end_at"),
                None,
            )
            is_smart = item.get("kind") == "smart_window"
            expired = (
                window_end_at is not None and local_now >= window_end_at
                if is_smart
                else delayed_at.date() != local_now.date()
            )
            if expired:
                changed = True
                await self._async_record_skip(
                    program,
                    delayed_at,
                    (
                        "Az intelligens öntözési időablak bezárult."
                        if is_smart
                        else "A szél miatt halasztott futás már nem aktuális."
                    ),
                )
                continue

            if run_key not in executed:
                executed.append(run_key)
            original_scheduled_at = _parse_runtime_datetime(
                item.get("original_scheduled_at"),
                delayed_at,
            )
            claim_id = str(uuid4())
            item["claim_id"] = claim_id
            item["claimed_at"] = dt_util.utcnow().isoformat()
            remaining.append(item)
            claimed.append(
                (
                    program,
                    run_key,
                    claim_id,
                    original_scheduled_at or delayed_at,
                    window_end_at,
                )
            )
            changed = True

        if changed:
            self.store.runtime["delayed_runs"] = remaining
            await self.store.async_save()
            self._notify_listeners()
        for program, run_key, claim_id, original_at, window_end_at in claimed:
            self._create_task(
                self._async_run_claimed_delayed(
                    program,
                    local_now,
                    run_key,
                    claim_id,
                    original_at,
                    window_end_at,
                ),
                f"{DOMAIN}_delayed_{program.program_id}",
            )

    async def _async_run_claimed_delayed(
        self,
        program: IrrigationProgram,
        evaluation_at: datetime,
        run_key: str,
        claim_id: str,
        original_scheduled_at: datetime,
        window_end_at: datetime | None,
    ) -> None:
        """Run one durable claim and only remove the exact claimed record."""
        remove_claim = False
        cancelled = False
        try:
            await self.async_run_program(
                program,
                evaluation_at,
                allow_wind_delay=True,
                run_key=run_key,
                original_scheduled_at=original_scheduled_at,
                window_end_at=window_end_at,
            )
            remove_claim = True
        except asyncio.CancelledError:
            cancelled = True
            raise
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Smart Yardian delayed run failed before completion")
        finally:
            if not cancelled:
                await self._async_finish_delayed_claim(
                    run_key,
                    claim_id,
                    remove=remove_claim,
                )

    async def _async_finish_delayed_claim(
        self,
        run_key: str,
        claim_id: str,
        *,
        remove: bool,
    ) -> None:
        """Remove or release one exact persisted claim without touching replans."""
        changed = False
        delayed_runs: list[dict[str, Any]] = []
        for raw in list(self.store.runtime.get("delayed_runs") or []):
            item = dict(raw)
            if (
                str(item.get("run_key") or "") == run_key
                and str(item.get("claim_id") or "") == claim_id
            ):
                changed = True
                if remove:
                    continue
                item.pop("claim_id", None)
                item.pop("claimed_at", None)
            delayed_runs.append(item)
        if changed:
            self.store.runtime["delayed_runs"] = delayed_runs
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
                    if observation and target.date() == dt_util.as_local(dt_util.now()).date()
                    else 0.0
                ),
                rain_station=(
                    f"{observation.location} ({observation.station_id})"
                    if observation and target.date() == dt_util.as_local(dt_util.now()).date()
                    else None
                ),
                latitude=float(self.hass.config.latitude),
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
            and (now - self._rain_observations_at).total_seconds() < RAIN_MAP_CACHE_SECONDS
        ):
            return self._rain_observations

        session = async_get_clientsession(self.hass)
        try:
            async with session.get(
                IDOKEP_RAIN_MAP_URL,
                headers={
                    "User-Agent": (
                        "HomeAssistant SmartYardian/0.16.0 "
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
                "Az Időkép csapadéktérképe nem tartalmazott feldolgozható automataadatot."
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
            self.last_rain_error = f"A kiválasztott Időkép automata nem található: {station_id}."
            return None
        self.last_rain_observation = {
            **observation.as_dict(),
            "fetched_at": (
                self._rain_observations_at.isoformat() if self._rain_observations_at else None
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
        now = dt_util.now()
        forecast = rebase_idokep_timeline(
            normalize_ha_forecast(items),
            now,
        )
        if not forecast:
            raise WeatherUnavailableError("Az Időkép nem adott használható órás előrejelzést.")
        if any(hour.wind_speed_kmh is None for hour in forecast):
            forecast = await self._async_enrich_idokep_wind(forecast)
        forecast = merge_hourly_forecast_snapshots(
            self._idokep_forecast_snapshot,
            forecast,
            now,
        )
        self._idokep_forecast_snapshot = forecast
        self._idokep_forecast_refreshed_at = dt_util.utcnow()
        return forecast

    async def _async_enrich_idokep_wind(
        self,
        forecast: list[ForecastHour],
    ) -> list[ForecastHour]:
        """Fill missing HA wind values from the same Időkép hourly page."""
        try:
            wind_hours = await self._async_idokep_wind_forecast()
        except WeatherUnavailableError as err:
            _LOGGER.warning("Időkép wind fallback unavailable: %s", err)
            return forecast
        return merge_idokep_hourly_wind(forecast, wind_hours)

    async def _async_idokep_wind_forecast(
        self,
        *,
        force: bool = False,
    ) -> list[IdokepWindHour]:
        """Fetch and cache numeric wind values from Időkép hourly cards."""
        utc_now = dt_util.utcnow()
        if (
            not force
            and self._idokep_wind_attempted_at is not None
            and (utc_now - self._idokep_wind_attempted_at).total_seconds()
            < IDOKEP_WIND_CACHE_SECONDS
        ):
            if self._idokep_wind_hours:
                return self._idokep_wind_hours
            raise WeatherUnavailableError(
                self._idokep_wind_error or "Az Időkép órás széladata átmenetileg nem érhető el."
            )

        self._idokep_wind_attempted_at = utc_now
        location = self._idokep_location()
        if not location:
            self._idokep_wind_error = "Nincs beállítva az Időkép-előrejelzés települése."
            raise WeatherUnavailableError(self._idokep_wind_error)

        session = async_get_clientsession(self.hass)
        url = IDOKEP_FORECAST_URL.format(location=quote(location, safe=""))
        try:
            async with session.get(
                url,
                headers={
                    "User-Agent": (
                        "HomeAssistant SmartYardian/0.16.0 "
                        "(https://github.com/mistenes/smart-yardian)"
                    )
                },
                timeout=15,
            ) as response:
                response.raise_for_status()
                document = await response.text()
        except Exception as err:  # noqa: BLE001
            self._idokep_wind_error = f"Az Időkép órás széladata nem tölthető le: {err}"
            self._idokep_wind_hours = []
            raise WeatherUnavailableError(self._idokep_wind_error) from err

        wind_hours = parse_idokep_hourly_wind(document, dt_util.now())
        if not wind_hours:
            self._idokep_wind_error = (
                "Az Időkép órás oldala nem tartalmazott feldolgozható széladatot."
            )
            self._idokep_wind_hours = []
            raise WeatherUnavailableError(self._idokep_wind_error)

        self._idokep_wind_hours = wind_hours
        self._idokep_wind_error = None
        return wind_hours

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
                    "precipitation_probability": round(hour.precipitation_probability),
                    "condition": hour.condition,
                    "cloud_cover": (
                        round(hour.cloud_cover) if hour.cloud_cover is not None else None
                    ),
                    "is_daylight": hour.is_daylight,
                    "wind_speed_kmh": (
                        round(hour.wind_speed_kmh, 1) if hour.wind_speed_kmh is not None else None
                    ),
                    "wind_gust_kmh": (
                        round(hour.wind_gust_kmh, 1) if hour.wind_gust_kmh is not None else None
                    ),
                    "wind_bearing_deg": (
                        round(hour.wind_bearing_deg) if hour.wind_bearing_deg is not None else None
                    ),
                }
                for hour in forecast
            ],
        }

    async def async_three_day_preview(self) -> dict[str, Any]:
        """Calculate a read-only preview of the next three calendar days."""
        now = dt_util.as_local(dt_util.now())
        occurrences = upcoming_occurrences(self.store.programs, now, days=3)
        executed = set(self.store.runtime.get("executed") or [])
        delayed_keys = {
            str(item.get("run_key") or "") for item in self.store.runtime.get("delayed_runs") or []
        }
        active_key = str((self.active_run or {}).get("run_key") or "")
        occurrences = [
            occurrence
            for occurrence in occurrences
            if (
                self._program_run_key(occurrence) not in executed
                or self._program_run_key(occurrence) in delayed_keys
                or self._program_run_key(occurrence) == active_key
            )
        ]
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
        occurrence_targets: dict[tuple[str, str], datetime] = {}
        occurrence_days: dict[tuple[str, str], str] = {}

        weather_days: dict[str, datetime] = {}
        for occurrence in occurrences:
            program = occurrence.program
            occurrence_key = (
                program.program_id,
                (occurrence.service_date or occurrence.scheduled_at.date()).isoformat(),
            )
            target_at = occurrence.scheduled_at
            display_date = occurrence.scheduled_at.date()
            if (
                occurrence.window_start_at is not None
                and occurrence.window_end_at is not None
                and occurrence.window_start_at <= now < occurrence.window_end_at
            ):
                target_at = now
                display_date = now.date()
            occurrence_targets[occurrence_key] = target_at
            occurrence_days[occurrence_key] = display_date.isoformat()
            if (
                program.schedule_mode == "smart_window"
                or program.weather_adjustment
                or program.temperature_condition_enabled
                or any(zone.duration_mode == "reference" for zone in program.zones)
                or self._program_uses_wind_guard(program)
            ):
                weather_days.setdefault(
                    target_at.date().isoformat(),
                    target_at,
                )
                if (
                    program.schedule_mode == "smart_window"
                    and occurrence.window_end_at is not None
                    and occurrence.window_end_at.date() != target_at.date()
                ):
                    closing_day_target = occurrence.window_end_at - timedelta(minutes=1)
                    weather_days.setdefault(
                        closing_day_target.date().isoformat(),
                        closing_day_target,
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
                            if rain_observation and scheduled_at.date() == now.date()
                            else 0.0
                        ),
                        rain_station=(
                            f"{rain_observation.location} ({rain_observation.station_id})"
                            if rain_observation and scheduled_at.date() == now.date()
                            else None
                        ),
                        latitude=float(self.hass.config.latitude),
                    )
                except WeatherUnavailableError as err:
                    idokep_day_error = str(err)

            day_decisions[day_key] = decision
            if decision is None:
                day_errors[day_key] = f"Időkép: {idokep_day_error}"

        skip_next_consumed: set[str] = set()
        preview_smart_intervals: list[tuple[datetime, datetime]] = []

        for occurrence in occurrences:
            program = occurrence.program
            occurrence_key = (
                program.program_id,
                (occurrence.service_date or occurrence.scheduled_at.date()).isoformat(),
            )
            target_at = occurrence_targets[occurrence_key]
            day_key = target_at.date().isoformat()
            needs_weather = (
                program.schedule_mode == "smart_window"
                or program.weather_adjustment
                or program.temperature_condition_enabled
                or any(zone.duration_mode == "reference" for zone in program.zones)
                or self._program_uses_wind_guard(program)
            )
            decision = day_decisions.get(day_key) if needs_weather else None
            weather_error = day_errors.get(day_key) if needs_weather else None
            smart_day_floor: datetime | None = None

            if decision is not None and not program.weather_adjustment:
                decision = replace(
                    decision,
                    factor=1.0,
                    rain_factor=1.0,
                    climate_factor=1.0,
                )
            if (
                program.schedule_mode == "smart_window"
                and decision is not None
                and occurrence.window_end_at is not None
                and occurrence.window_end_at.date() != target_at.date()
                and (
                    not program.temperature_condition_matches(
                        decision.max_temperature
                    )
                    or decision.factor == 0
                )
            ):
                next_day_key = occurrence.window_end_at.date().isoformat()
                next_day_decision = day_decisions.get(next_day_key)
                if next_day_decision is not None and not program.weather_adjustment:
                    next_day_decision = replace(
                        next_day_decision,
                        factor=1.0,
                        rain_factor=1.0,
                        climate_factor=1.0,
                    )
                decision = next_day_decision
                weather_error = day_errors.get(next_day_key)
                smart_day_floor = occurrence.window_end_at.replace(
                    hour=0,
                    minute=0,
                    second=0,
                    microsecond=0,
                )

            zones = [
                self._preview_zone(
                    zone,
                    decision,
                    program.weather_adjustment,
                    program.soil_moisture_enabled,
                )
                for zone in program.zones
            ]
            planned_minutes = [
                int(zone["planned_minutes"])
                for zone in zones
                if zone["planned_minutes"] is not None
            ]
            total_minutes = sum(planned_minutes) if len(planned_minutes) == len(zones) else None
            wind_assessment: WindAssessment | None = None
            smart_choice: SmartSlotChoice | None = None
            planning_status: str | None = None
            planned_at = occurrence.scheduled_at
            planned_end_at: datetime | None = None
            selection_reason: str | None = None
            if program.schedule_mode == "smart_window":
                planning_status = "smart_waiting_forecast"
                if (
                    decision is not None
                    and idokep_forecast is not None
                    and total_minutes is not None
                    and total_minutes > 0
                    and occurrence.window_start_at is not None
                    and occurrence.window_end_at is not None
                ):
                    run_key = self._program_run_key(occurrence)
                    blocked_intervals = [
                        *self._smart_blocked_intervals(
                            run_key,
                            occurrence.window_start_at,
                            occurrence.window_end_at,
                        ),
                        *preview_smart_intervals,
                    ]
                    planning_not_before = (
                        now if occurrence.window_start_at <= now else occurrence.window_start_at
                    )
                    paused_until = self._pause_until_at(occurrence.window_start_at.tzinfo)
                    if paused_until is not None:
                        planning_not_before = max(
                            planning_not_before,
                            paused_until,
                        )
                    if smart_day_floor is not None:
                        planning_not_before = max(
                            planning_not_before,
                            smart_day_floor,
                        )
                    smart_choice = select_smart_watering_slot(
                        idokep_forecast,
                        occurrence.window_start_at,
                        occurrence.window_end_at,
                        total_minutes,
                        self._program_head_types(program),
                        self.store.settings,
                        now=planning_not_before,
                        blocked_intervals=blocked_intervals,
                        transition_buffer_minutes=(
                            self._program_transition_buffer_minutes(program)
                        ),
                    )
                    selection_reason = smart_choice.reason
                    if (
                        smart_choice.status == "planned"
                        and smart_choice.scheduled_at is not None
                        and smart_choice.planned_end_at is not None
                    ):
                        planning_status = "smart_planned"
                        planned_at = smart_choice.scheduled_at
                        planned_end_at = smart_choice.planned_end_at
                        if planned_at.date() != target_at.date():
                            selected_day_key = planned_at.date().isoformat()
                            selected_decision = day_decisions.get(selected_day_key)
                            if selected_decision is not None and not program.weather_adjustment:
                                selected_decision = replace(
                                    selected_decision,
                                    factor=1.0,
                                    rain_factor=1.0,
                                    climate_factor=1.0,
                                )
                            if selected_decision is None:
                                decision = None
                                weather_error = day_errors.get(selected_day_key)
                                zones = [
                                    self._preview_zone(
                                        zone,
                                        None,
                                        program.weather_adjustment,
                                        program.soil_moisture_enabled,
                                    )
                                    for zone in program.zones
                                ]
                                total_minutes = None
                                smart_choice = None
                                planning_status = "smart_waiting_forecast"
                                selection_reason = None
                                planned_at = occurrence.scheduled_at
                                planned_end_at = None
                            else:
                                decision = selected_decision
                                zones = [
                                    self._preview_zone(
                                        zone,
                                        decision,
                                        program.weather_adjustment,
                                        program.soil_moisture_enabled,
                                    )
                                    for zone in program.zones
                                ]
                                selected_minutes = [
                                    int(zone["planned_minutes"])
                                    for zone in zones
                                    if zone["planned_minutes"] is not None
                                ]
                                total_minutes = (
                                    sum(selected_minutes)
                                    if len(selected_minutes) == len(zones)
                                    else None
                                )
                                if total_minutes and total_minutes > 0:
                                    selected_day_start = planned_at.replace(
                                        hour=0,
                                        minute=0,
                                        second=0,
                                        microsecond=0,
                                    )
                                    smart_choice = select_smart_watering_slot(
                                        idokep_forecast,
                                        occurrence.window_start_at,
                                        occurrence.window_end_at,
                                        total_minutes,
                                        self._program_head_types(program),
                                        self.store.settings,
                                        now=max(
                                            planning_not_before,
                                            selected_day_start,
                                        ),
                                        blocked_intervals=blocked_intervals,
                                        transition_buffer_minutes=(
                                            self._program_transition_buffer_minutes(program)
                                        ),
                                    )
                                    selection_reason = smart_choice.reason
                                    if (
                                        smart_choice.status == "planned"
                                        and smart_choice.scheduled_at is not None
                                        and smart_choice.planned_end_at is not None
                                    ):
                                        planned_at = smart_choice.scheduled_at
                                        planned_end_at = smart_choice.planned_end_at
                                    else:
                                        planning_status = "smart_no_fit"
                                        planned_at = occurrence.scheduled_at
                                        planned_end_at = None
                                else:
                                    smart_choice = None
                                    planning_status = None
                                    selection_reason = None
                                    planned_at = occurrence.scheduled_at
                                    planned_end_at = None
                    else:
                        planning_status = "smart_no_fit"
                elif decision is not None and total_minutes == 0:
                    planning_status = None
                if (
                    smart_choice is not None
                    and smart_choice.status == "planned"
                    and smart_choice.scheduled_at is not None
                    and smart_choice.planned_end_at is not None
                ):
                    planning_status = "smart_planned"
                    planned_at = smart_choice.scheduled_at
                    planned_end_at = smart_choice.planned_end_at
                    preview_smart_intervals.append((planned_at, planned_end_at))
                    wind_assessment = WindAssessment(
                        smart_choice.wind_action or "none",
                        smart_choice.wind_reason or smart_choice.reason,
                        smart_choice.max_wind_speed_kmh,
                        smart_choice.max_wind_gust_kmh,
                        0,
                    )
                    if decision is not None:
                        decision = self._decision_with_wind(
                            decision,
                            wind_assessment,
                        )
            elif (
                decision is not None
                and idokep_forecast is not None
                and self._program_uses_wind_guard(program)
                and len(planned_minutes) == len(zones)
                and sum(planned_minutes) > 0
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
            elif self._paused_at(planned_at):
                status = "paused"
                reason = "Az automatika ekkor még szünetel."
            elif program.skip_next and program.program_id not in skip_next_consumed:
                skip_next_consumed.add(program.program_id)
                status = "skip_next"
                reason = "A következő futás kihagyásra van jelölve."
            elif weather_error:
                status = "weather_unavailable"
                reason = f"Nincs elég megbízható előrejelzés. {weather_error}"
            elif decision and not program.temperature_condition_matches(decision.max_temperature):
                status = "condition_skip"
                reason = program.temperature_condition_reason(decision.max_temperature)
            elif decision and program.weather_adjustment and decision.factor == 0:
                status = "rain_skip"
                reason = decision.reason
            elif (
                program.soil_moisture_enabled
                and zones
                and all(zone["moisture_action"] == "skip" for zone in zones)
            ):
                status = "moisture_skip"
                reason = self._soil_moisture_skip_reason(zones)
            elif smart_choice and smart_choice.status != "planned":
                status = "smart_no_fit"
                reason = smart_choice.reason
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
            elif wind_assessment and wind_assessment.action == "warn":
                reason = wind_assessment.reason
            elif smart_choice and smart_choice.status == "planned":
                reason = smart_choice.reason
            elif program.soil_moisture_enabled and any(
                zone["moisture_action"] == "skip" for zone in zones
            ):
                reason = self._soil_moisture_skip_reason(zones, partial=True)

            item = {
                "program_id": program.program_id,
                "program_name": program.name,
                "schedule_mode": program.schedule_mode,
                "scheduled_at": planned_at.isoformat(),
                "planned_end_at": (planned_end_at.isoformat() if planned_end_at else None),
                "window_start_at": (
                    occurrence.window_start_at.isoformat() if occurrence.window_start_at else None
                ),
                "window_end_at": (
                    occurrence.window_end_at.isoformat() if occurrence.window_end_at else None
                ),
                "planning_status": planning_status,
                "selection_reason": selection_reason,
                "status": status,
                "reason": reason,
                "total_minutes": total_minutes,
                "zones": zones,
                "weather": decision.as_dict() if decision else None,
            }
            days_by_date[occurrence_days[occurrence_key]]["programs"].append(item)

        return {
            "generated_at": now.isoformat(),
            "days": days,
        }

    def _preview_zone(
        self,
        zone: ProgramZone,
        decision: WeatherDecision | None,
        apply_weather: bool,
        apply_soil_moisture: bool,
    ) -> dict[str, Any]:
        """Calculate one zone without starting hardware."""
        state = self.hass.states.get(zone.entity_id)
        duration: int | None
        if apply_weather and decision is not None and decision.factor == 0:
            duration = 0
        elif zone.duration_mode == "reference":
            if decision is None:
                duration = None
            elif decision.irrigation_target_mm is not None:
                duration = reference_duration_for_depth(
                    self.zone_profile(zone.entity_id),
                    decision.irrigation_target_mm,
                    decision.rain_factor if apply_weather else 1.0,
                )
            else:
                duration = reference_duration_minutes(
                    self.zone_profile(zone.entity_id),
                    decision.max_temperature,
                    decision.rain_factor if apply_weather else 1.0,
                )
        elif apply_weather and decision is None:
            duration = None
        else:
            factor = decision.factor if decision and apply_weather else 1.0
            duration = max(1, min(180, round(zone.duration_minutes * factor)))
        moisture = self._soil_moisture_context(zone, apply_soil_moisture)
        if duration is not None:
            duration = adjust_duration_for_soil_moisture(
                duration,
                float(moisture["moisture_factor"]),
            )
        return {
            "entity_id": zone.entity_id,
            "name": state.name if state else zone.entity_id,
            "duration_mode": zone.duration_mode,
            "planned_minutes": duration,
            **moisture,
        }

    def _soil_moisture_context(
        self,
        zone: ProgramZone,
        enabled: bool,
    ) -> dict[str, Any]:
        """Return the current sensor reading and runtime adjustment for a zone."""
        profile = self.zone_profile(zone.entity_id)
        sensor_entity_id = profile.moisture_sensor_entity_id
        if not enabled:
            return {
                "moisture_sensor_entity_id": sensor_entity_id,
                "moisture_sensor_name": None,
                "moisture_percent": None,
                "moisture_factor": 1.0,
                "moisture_action": "disabled",
                "moisture_reason": "A program nem használ talajnedvesség-korrekciót.",
            }
        if not sensor_entity_id:
            return {
                "moisture_sensor_entity_id": None,
                "moisture_sensor_name": None,
                "moisture_percent": None,
                "moisture_factor": 1.0,
                "moisture_action": "not_configured",
                "moisture_reason": "A zónához nincs talajnedvességmérő rendelve.",
            }
        state = self.hass.states.get(sensor_entity_id)
        sensor_name = state.name if state else sensor_entity_id
        unit = str(state.attributes.get("unit_of_measurement") or "").strip() if state else ""
        if unit and unit != "%":
            return {
                "moisture_sensor_entity_id": sensor_entity_id,
                "moisture_sensor_name": sensor_name,
                "moisture_percent": None,
                "moisture_factor": 1.0,
                "moisture_action": "unavailable",
                "moisture_reason": (
                    f"A szenzor mértékegysége {unit}, nem százalék; az időtartam nem módosul."
                ),
            }
        assessment = assess_soil_moisture(
            (state.state if state and state.state not in UNAVAILABLE_STATES else None),
            self.store.settings,
        )
        return {
            "moisture_sensor_entity_id": sensor_entity_id,
            "moisture_sensor_name": sensor_name,
            "moisture_percent": (
                round(assessment.percent, 1) if assessment.percent is not None else None
            ),
            "moisture_factor": round(assessment.factor, 3),
            "moisture_action": assessment.action,
            "moisture_reason": assessment.reason,
        }

    @staticmethod
    def _soil_moisture_skip_reason(
        zones: list[dict[str, Any]],
        *,
        partial: bool = False,
    ) -> str:
        """Summarize moisture-skipped zones for previews and history."""
        skipped = [zone for zone in zones if zone.get("moisture_action") == "skip"]
        readings = ", ".join(
            f"{zone['name']}: {zone['moisture_percent']:g}%"
            for zone in skipped
            if zone.get("moisture_percent") is not None
        )
        suffix = f" ({readings})" if readings else ""
        if partial:
            return (
                f"Talajnedvesség alapján {len(skipped)} zóna kimarad{suffix}; a többi zóna lefut."
            )
        return f"Minden programzóna kimarad a talajnedvesség alapján{suffix}."

    def _paused_at(self, scheduled_at: datetime) -> bool:
        """Return whether a future occurrence is inside the pause window."""
        until = self._pause_until_at(scheduled_at.tzinfo)
        return until is not None and scheduled_at < until

    def _pause_until_at(self, timezone: Any) -> datetime | None:
        """Return the configured pause timestamp in the requested timezone."""
        paused_until = self.store.settings.get("paused_until")
        if not paused_until:
            return None
        try:
            until = datetime.fromisoformat(str(paused_until))
            if until.tzinfo is None:
                until = until.replace(tzinfo=UTC)
            return until.astimezone(timezone)
        except ValueError:
            return None

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
        self._remove_delayed_program_runs(program.program_id)
        await self.store.async_save()
        self._notify_listeners()
        return program

    def manual_program_from_dict(self, raw: dict[str, Any]) -> IrrigationProgram:
        """Validate an ephemeral program without storing it."""
        program = IrrigationProgram.from_dict(raw)
        unknown = {
            zone.entity_id for zone in program.zones if zone.entity_id not in self.zone_entities
        }
        if unknown:
            raise ValueError(f"Ismeretlen Yardian zóna: {', '.join(sorted(unknown))}")
        program.enabled = False
        program.skip_next = False
        return program

    async def async_delete_program(self, program_id: str) -> None:
        """Delete a program."""
        original = len(self.store.programs)
        self.store.programs = [
            program for program in self.store.programs if program.program_id != program_id
        ]
        if len(self.store.programs) == original:
            raise ValueError("A program nem található.")
        self._remove_delayed_program_runs(program_id)
        await self.store.async_save()
        self._notify_listeners()

    def _remove_delayed_program_runs(self, program_id: str) -> None:
        """Cancel future wind or smart starts when a program changes."""
        self.store.runtime["delayed_runs"] = [
            item
            for item in list(self.store.runtime.get("delayed_runs") or [])
            if str(item.get("program_id") or "") != program_id
        ]

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
            "et_reference_mm": (0.1, 20),
            "et_crop_coefficient": (0.1, 2),
            "soil_moisture_dry_percent": (0, 100),
            "soil_moisture_target_percent": (0, 100),
            "soil_moisture_skip_percent": (0, 100),
            "soil_moisture_max_factor": (1, 2),
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
                "evapotranspiration_enabled",
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
        if not (
            candidate["soil_moisture_dry_percent"]
            < candidate["soil_moisture_target_percent"]
            < candidate["soil_moisture_skip_percent"]
        ):
            raise ValueError(
                "A talajnedvesség értékei növekvő sorrendben legyenek: "
                "száraz küszöb, célérték, kihagyási küszöb."
            )
        if candidate["rain_reduce_low_mm"] > candidate["rain_reduce_high_mm"]:
            raise ValueError(
                "Az enyhe eső küszöbe nem lehet nagyobb az erős csökkentés küszöbénél."
            )
        current_location = self._idokep_location()
        if (
            requested_idokep_location is not None
            and requested_idokep_location.casefold() != current_location.casefold()
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
            self.hass.config_entries.async_get_entry(config_entry_id) if config_entry_id else None
        )
        if config_entry is None or config_entry.domain != "idokep":
            raise ValueError("A kiválasztott weather entitás nem az Időkép integrációhoz tartozik.")
        return config_entry

    def _idokep_location(self) -> str:
        """Return the settlement currently configured in Időkép."""
        try:
            entry = self._idokep_config_entry()
        except ValueError:
            return str(self.store.settings.get("idokep_location") or "")
        return str(
            entry.data.get("location_name") or self.store.settings.get("idokep_location") or ""
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
                        "HomeAssistant SmartYardian/0.16.0 "
                        "(https://github.com/mistenes/smart-yardian)"
                    )
                },
                timeout=15,
            ) as response:
                response.raise_for_status()
                document = await response.text()
        except Exception as err:  # noqa: BLE001
            raise ValueError(f"Az Időkép település-ellenőrzése nem sikerült: {err}") from err
        if "wide-hourly-forecast-card" not in document:
            raise ValueError(f"Az Időkép nem adott órás előrejelzést ehhez: {location}.")

        entry = self._idokep_config_entry()
        old_data = dict(entry.data)
        new_data = {**old_data, "location_name": location}
        self.hass.config_entries.async_update_entry(entry, data=new_data)
        try:
            await self.hass.config_entries.async_reload(entry.entry_id)
        except Exception as err:  # noqa: BLE001
            self.hass.config_entries.async_update_entry(entry, data=old_data)
            await self.hass.config_entries.async_reload(entry.entry_id)
            raise ValueError("Az Időkép integráció nem tudott átállni az új településre.") from err

    def zone_profile(self, entity_id: str) -> ZoneProfile:
        """Return a configured profile or a safe in-memory default."""
        return self.store.zone_profiles.get(entity_id) or ZoneProfile.default(entity_id)

    async def async_update_zone_profiles(self, profiles: list[dict[str, Any]]) -> None:
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
        window_end_at: datetime | None = None,
    ) -> None:
        """Run every zone safely under one global lock."""
        scheduled_at = scheduled_at or dt_util.now()
        original_scheduled_at = original_scheduled_at or scheduled_at
        apply_weather = program.weather_adjustment if apply_weather is None else apply_weather
        run_id = str(uuid4())
        uses_reference = any(zone.duration_mode == "reference" for zone in program.zones)
        uses_temperature_condition = program.temperature_condition_enabled
        uses_wind_guard = self._program_uses_wind_guard(program)
        smart_automatic = bool(
            allow_wind_delay
            and program.schedule_mode == "smart_window"
            and window_end_at is not None
        )

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

            evaluation_now = dt_util.as_local(dt_util.now()).replace(
                second=0,
                microsecond=0,
            )
            if allow_wind_delay:
                try:
                    current_program = self.get_program(program.program_id)
                except ValueError:
                    current_program = None
                if not self.automation_available(evaluation_now):
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        "Az automatika a várakozás közben kikapcsolt vagy szünetel.",
                    )
                    return
                if (
                    current_program is None
                    or not current_program.enabled
                    or current_program.as_dict() != program.as_dict()
                ):
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        "A program a várakozás közben módosult vagy le lett tiltva.",
                    )
                    return
                if current_program.skip_next:
                    current_program.skip_next = False
                    await self.store.async_save()
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        "A következő futást a felhasználó a várakozás közben kihagyta.",
                    )
                    return

            decision_at = evaluation_now if allow_wind_delay else scheduled_at
            decision = (
                await self.async_weather_decision(decision_at)
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
            if not apply_weather and (uses_reference or uses_temperature_condition):
                reason_parts = []
                if uses_reference:
                    reason_parts.append("referenciaidő a becsült napi párolgásból")
                if uses_temperature_condition:
                    reason_parts.append("hőmérséklet-feltétel ellenőrizve")
                decision = replace(
                    decision,
                    factor=1.0,
                    rain_factor=1.0,
                    climate_factor=1.0,
                    reason=f"{', '.join(reason_parts).capitalize()}, esőkorrekció nélkül.",
                )
            slot_not_before = evaluation_now
            current_day_blocks = (
                not program.temperature_condition_matches(decision.max_temperature)
                or decision.factor == 0
            )
            if (
                smart_automatic
                and window_end_at is not None
                and window_end_at.date() != evaluation_now.date()
                and current_day_blocks
            ):
                next_day_target = window_end_at - timedelta(minutes=1)
                decision = await self.async_weather_decision(next_day_target)
                if not apply_weather and (uses_reference or uses_temperature_condition):
                    decision = replace(
                        decision,
                        factor=1.0,
                        rain_factor=1.0,
                        climate_factor=1.0,
                        reason=(
                            "Az éjfél utáni időpont időtartama újraszámítva, "
                            "esőkorrekció nélkül."
                        ),
                    )
                slot_not_before = max(
                    evaluation_now,
                    next_day_target.replace(
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    ),
                )
            if not program.temperature_condition_matches(decision.max_temperature):
                await self._async_record_skip(
                    program,
                    scheduled_at,
                    program.temperature_condition_reason(decision.max_temperature),
                    decision,
                )
                return
            if decision.factor == 0:
                await self._async_record_skip(program, scheduled_at, decision.reason, decision)
                return
            zone_results = [
                self._zone_run_details(
                    zone,
                    decision,
                    program.soil_moisture_enabled,
                )
                for zone in program.zones
            ]
            if (
                program.soil_moisture_enabled
                and zone_results
                and all(result["moisture_action"] == "skip" for result in zone_results)
            ):
                await self._async_record_skip(
                    program,
                    scheduled_at,
                    self._soil_moisture_skip_reason(zone_results),
                    decision,
                    zones=zone_results,
                )
                return
            total_minutes = sum(int(result["planned_minutes"]) for result in zone_results)
            if smart_automatic:
                forecast = await self._async_idokep_forecast()
                choice = select_smart_watering_slot(
                    forecast,
                    original_scheduled_at,
                    window_end_at,
                    total_minutes,
                    self._program_head_types(program),
                    self.store.settings,
                    now=slot_not_before,
                    blocked_intervals=self._smart_blocked_intervals(
                        run_key,
                        original_scheduled_at,
                        window_end_at,
                    ),
                    transition_buffer_minutes=(self._program_transition_buffer_minutes(program)),
                )
                if choice.status != "planned" or choice.scheduled_at is None:
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        choice.reason,
                        decision,
                        zones=zone_results,
                    )
                    return
                smart_wind = WindAssessment(
                    choice.wind_action or "none",
                    choice.wind_reason or choice.reason,
                    choice.max_wind_speed_kmh,
                    choice.max_wind_gust_kmh,
                    0,
                )
                decision = self._decision_with_wind(decision, smart_wind)
                decision = replace(
                    decision,
                    reason=f"{decision.reason} {choice.reason}",
                )
                if choice.scheduled_at > evaluation_now:
                    await self._async_schedule_smart_start(
                        program,
                        original_scheduled_at,
                        evaluation_now,
                        choice,
                        run_key,
                    )
                    return
            elif uses_wind_guard and (allow_wind_delay or apply_weather):
                try:
                    forecast = await self._async_idokep_forecast()
                    wind_assessment = find_wind_delay(
                        forecast,
                        scheduled_at,
                        total_minutes,
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
            if smart_automatic and window_end_at is not None:
                projected_end = dt_util.utcnow() + timedelta(
                    minutes=(total_minutes + self._program_transition_buffer_minutes(program))
                )
                if projected_end > window_end_at.astimezone(UTC):
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        (
                            f"A {total_minutes} perces program a várakozás után "
                            f"már nem fér bele a {window_end_at.strftime('%H:%M')}-kor "
                            "záródó időablakba."
                        ),
                        decision,
                        zones=zone_results,
                    )
                    return
            await self._async_execute_program(
                run_id,
                program,
                scheduled_at,
                decision,
                zone_results,
                run_key=run_key,
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
        return [self.zone_profile(zone.entity_id).head_type for zone in program.zones]

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

    def _smart_blocked_intervals(
        self,
        run_key: str | None,
        window_start_at: datetime,
        window_end_at: datetime,
    ) -> list[tuple[datetime, datetime]]:
        """Return fixed, delayed and active irrigation intervals to avoid."""
        blocked: list[tuple[datetime, datetime]] = []
        for item in self.store.runtime.get("delayed_runs") or []:
            if run_key and str(item.get("run_key") or "") == run_key:
                continue
            starts_at = _parse_runtime_datetime(item.get("scheduled_at"), None)
            ends_at = _parse_runtime_datetime(item.get("planned_end_at"), None)
            if starts_at is None:
                continue
            if ends_at is None:
                try:
                    delayed_program = self.get_program(str(item["program_id"]))
                    duration = self._estimated_program_minutes(delayed_program)
                except (KeyError, ValueError):
                    duration = 30
                ends_at = starts_at + timedelta(minutes=duration)
            if starts_at < window_end_at and ends_at > window_start_at:
                blocked.append((starts_at, ends_at))

        for occurrence in upcoming_occurrences(
            self.store.programs,
            window_start_at - timedelta(minutes=1),
            days=2,
        ):
            if occurrence.program.schedule_mode != "fixed":
                continue
            starts_at = occurrence.scheduled_at
            ends_at = starts_at + timedelta(
                minutes=self._estimated_program_minutes(occurrence.program)
            )
            if starts_at < window_end_at and ends_at > window_start_at:
                blocked.append((starts_at, ends_at))

        if self.active_run:
            now = dt_util.as_local(dt_util.now())
            remaining = max(
                1,
                int(self.active_run.get("total_minutes") or 0)
                - int(self.active_run.get("completed_minutes") or 0),
            )
            active_end = now + timedelta(minutes=remaining)
            if now < window_end_at and active_end > window_start_at:
                blocked.append((now, active_end))
        return blocked

    def _estimated_program_minutes(self, program: IrrigationProgram) -> int:
        """Return a conservative conflict estimate before weather calculation."""
        weather_factor = (
            max(1.0, float(self.store.settings.get("factor_max", 1.5)))
            if program.weather_adjustment
            else 1.0
        )
        moisture_factor = (
            max(
                1.0,
                float(self.store.settings.get("soil_moisture_max_factor", 1.2)),
            )
            if program.soil_moisture_enabled
            else 1.0
        )
        zone_minutes = 0
        for zone in program.zones:
            if zone.duration_mode == "reference":
                zone_minutes += 180
            else:
                zone_minutes += min(
                    180,
                    ceil(zone.duration_minutes * weather_factor * moisture_factor),
                )
        transition_minutes = self._program_transition_buffer_minutes(program)
        return max(1, zone_minutes + transition_minutes)

    @staticmethod
    def _program_transition_buffer_minutes(program: IrrigationProgram) -> int:
        """Reserve worst-case state-confirmation time at the hard window edge."""
        return ceil(len(program.zones) * (START_CONFIRM_SECONDS + STOP_CONFIRM_SECONDS) / 60)

    async def _async_schedule_smart_start(
        self,
        program: IrrigationProgram,
        original_scheduled_at: datetime,
        evaluated_at: datetime,
        choice: SmartSlotChoice,
        run_key: str | None,
    ) -> None:
        """Persist the chosen start so restart and replanning cannot duplicate it."""
        if choice.scheduled_at is None or choice.planned_end_at is None:
            return
        key = run_key or (
            f"{program.program_id}:{original_scheduled_at.date().isoformat()}:smart_window"
        )
        delayed_runs = [
            item
            for item in list(self.store.runtime.get("delayed_runs") or [])
            if item.get("run_key") != key
        ]
        delayed_runs.append(
            {
                "kind": "smart_window",
                "run_key": key,
                "program_id": program.program_id,
                "program_name": program.name,
                "original_scheduled_at": original_scheduled_at.isoformat(),
                "scheduled_at": choice.scheduled_at.isoformat(),
                "planned_end_at": choice.planned_end_at.isoformat(),
                "window_end_at": choice.window_end_at.isoformat(),
                "previous_scheduled_at": evaluated_at.isoformat(),
                "planned_minutes": choice.duration_minutes,
                "planning_status": "smart_planned",
                "selection_reason": choice.reason,
                "created_at": dt_util.utcnow().isoformat(),
            }
        )
        self.store.runtime["delayed_runs"] = sorted(
            delayed_runs,
            key=lambda item: str(item.get("scheduled_at") or ""),
        )
        await self.store.async_save()
        self._notify_listeners()

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
            f"{program.program_id}:{original_scheduled_at.date().isoformat()}:{program.start_time}"
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
        zone_results: list[dict[str, Any]] | None = None,
        *,
        run_key: str | None = None,
    ) -> None:
        """Execute the program while holding the run lock."""
        self._stop_event.clear()
        self._skip_zone_event.clear()
        started = dt_util.utcnow()
        zone_results = zone_results or [
            self._zone_run_details(
                zone,
                decision,
                program.soil_moisture_enabled,
            )
            for zone in program.zones
        ]
        total_minutes = sum(int(item["planned_minutes"]) for item in zone_results)
        self.status = "running"
        self.last_error = None
        self.active_run = {
            "run_id": run_id,
            "program_id": program.program_id,
            "program_name": program.name,
            "run_key": run_key,
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
            for index, (zone, result) in enumerate(zip(program.zones, zone_results, strict=True)):
                if self._stop_event.is_set():
                    outcome = "stopped"
                    reason = "A futást a felhasználó leállította."
                    break
                duration = int(result["planned_minutes"])
                if duration <= 0:
                    result["outcome"] = "skipped"
                    continue
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
            moisture_skips = sum(
                1 for result in zone_results if result.get("moisture_action") == "skip"
            )
            if outcome == "completed" and moisture_skips:
                reason = f"{decision.reason} Talajnedvesség alapján {moisture_skips} zóna kimaradt."
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
        apply_soil_moisture: bool,
    ) -> dict[str, Any]:
        """Build one planned zone result before program execution."""
        if zone.duration_mode == "reference":
            profile = self.zone_profile(zone.entity_id)
            if decision.irrigation_target_mm is not None:
                target_mm = decision.irrigation_target_mm
                duration = reference_duration_for_depth(
                    profile,
                    target_mm,
                    decision.rain_factor,
                )
                base_minutes = reference_duration_for_depth(profile, target_mm)
                target_source = "Hargreaves-Samani ET"
            else:
                target_mm = seasonal_target(decision.max_temperature).depth_mm
                duration = reference_duration_minutes(
                    profile,
                    decision.max_temperature,
                    decision.rain_factor,
                )
                base_minutes = reference_duration_minutes(
                    profile,
                    decision.max_temperature,
                )
                target_source = "hőmérsékleti táblázat"
            calculation = {
                "duration_mode": "reference",
                "head_type": profile.head_type,
                "exposure": profile.exposure,
                "exposure_factor": profile.exposure_factor,
                "application_rate_mm_h": round(profile.effective_rate_mm_h, 2),
                "rate_source": profile.rate_source,
                "target_mm": round(target_mm, 2),
                "target_source": target_source,
                "rain_factor": decision.rain_factor,
            }
        else:
            duration = max(1, min(180, round(zone.duration_minutes * decision.factor)))
            base_minutes = zone.duration_minutes
            calculation = {"duration_mode": "manual"}
        pre_moisture_minutes = duration
        moisture = self._soil_moisture_context(zone, apply_soil_moisture)
        duration = adjust_duration_for_soil_moisture(
            duration,
            float(moisture["moisture_factor"]),
        )
        state = self.hass.states.get(zone.entity_id)
        return {
            "entity_id": zone.entity_id,
            "name": state.name if state else zone.entity_id,
            "base_minutes": base_minutes,
            "pre_moisture_minutes": pre_moisture_minutes,
            "planned_minutes": duration,
            "outcome": "pending",
            **calculation,
            **moisture,
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
            (state := self.hass.states.get(entity_id)) is not None and state.state == STATE_ON
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
            if (state := self.hass.states.get(entity_id)) is not None and state.state == STATE_ON
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
        *,
        zones: list[dict[str, Any]] | None = None,
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
            zones=zones or [],
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

    def next_run_plan(self, now: datetime | None = None) -> dict[str, Any] | None:
        """Return the next fixed start or persisted/intelligent opportunity."""
        now = dt_util.as_local(now or dt_util.now())
        candidates: list[tuple[datetime, dict[str, Any]]] = []
        active_key = str((self.active_run or {}).get("run_key") or "")
        for item in self.store.runtime.get("delayed_runs") or []:
            if active_key and str(item.get("run_key") or "") == active_key:
                continue
            delayed_at = _parse_runtime_datetime(item.get("scheduled_at"), None)
            if delayed_at is None:
                continue
            delayed_at = delayed_at.astimezone(now.tzinfo)
            try:
                program = self.get_program(str(item["program_id"]))
            except (KeyError, ValueError):
                continue
            display_at = delayed_at
            if delayed_at <= now:
                window_end_at = _parse_runtime_datetime(
                    item.get("window_end_at"),
                    None,
                )
                if window_end_at is not None:
                    window_end_at = window_end_at.astimezone(now.tzinfo)
                still_actionable = (
                    program.schedule_mode == "smart_window"
                    and window_end_at is not None
                    and now < window_end_at
                ) or (program.schedule_mode == "fixed" and delayed_at.date() == now.date())
                if not still_actionable:
                    continue
                display_at = now
            candidates.append(
                (
                    display_at,
                    {
                        "program_id": program.program_id,
                        "program_name": program.name,
                        "schedule_mode": program.schedule_mode,
                        "scheduled_at": display_at.isoformat(),
                        "planned_end_at": item.get("planned_end_at"),
                        "window_start_at": item.get("original_scheduled_at"),
                        "window_end_at": item.get("window_end_at"),
                        "planning_status": item.get("planning_status")
                        or (
                            "smart_planned" if program.schedule_mode == "smart_window" else "fixed"
                        ),
                        "selection_reason": (
                            "A tervezett időpont esedékes; a rendszer indításra vár."
                            if delayed_at <= now
                            else item.get("selection_reason") or item.get("reason")
                        ),
                    },
                )
            )

        executed = set(self.store.runtime.get("executed") or [])
        delayed_keys = {
            str(item.get("run_key") or "") for item in self.store.runtime.get("delayed_runs") or []
        }
        for occurrence in upcoming_occurrences(self.store.programs, now, days=8):
            run_key = self._program_run_key(occurrence)
            if run_key in executed or run_key in delayed_keys:
                continue
            scheduled_at = occurrence.scheduled_at
            if (
                occurrence.window_start_at is not None
                and occurrence.window_end_at is not None
                and occurrence.window_start_at <= now < occurrence.window_end_at
            ):
                scheduled_at = now
            planning_status = (
                "smart_waiting_forecast"
                if occurrence.program.schedule_mode == "smart_window"
                else "fixed"
            )
            candidates.append(
                (
                    scheduled_at,
                    {
                        "program_id": occurrence.program.program_id,
                        "program_name": occurrence.program.name,
                        "schedule_mode": occurrence.program.schedule_mode,
                        "scheduled_at": scheduled_at.isoformat(),
                        "planned_end_at": None,
                        "window_start_at": (
                            occurrence.window_start_at.isoformat()
                            if occurrence.window_start_at
                            else None
                        ),
                        "window_end_at": (
                            occurrence.window_end_at.isoformat()
                            if occurrence.window_end_at
                            else None
                        ),
                        "planning_status": planning_status,
                        "selection_reason": (
                            "A pontos kezdést az időablak nyitásakor választja ki."
                            if occurrence.program.schedule_mode == "smart_window"
                            else None
                        ),
                    },
                )
            )
        return min(candidates, key=lambda item: item[0])[1] if candidates else None

    def next_run(self, now: datetime | None = None) -> datetime | None:
        """Return the timestamp of the next planned irrigation opportunity."""
        plan = self.next_run_plan(now)
        return _parse_runtime_datetime(plan.get("scheduled_at"), None) if plan else None

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
                    "name": ((device.name_by_user or device.name) if device else "Yardian vezérlő"),
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
                moisture_state = self.hass.states.get(profile.moisture_sensor_entity_id)
                profile_data["moisture_sensor_state"] = (
                    moisture_state.state if moisture_state else "unavailable"
                )
                profile_data["moisture_sensor_unit"] = (
                    moisture_state.attributes.get("unit_of_measurement") if moisture_state else None
                )
            zone = {
                "entity_id": entity_id,
                "name": state.name if state else entity_id,
                "state": state_value,
                "available": available,
                "availability_issue": self._zone_availability_issue(entity_id, state_value),
                "profile": profile_data,
            }
            controller["zones"].append(zone)
            controller["zone_count"] += 1
            if available:
                controller["available_zone_count"] += 1

        for controller in controllers.values():
            controller["available"] = controller["available_zone_count"] > 0

        next_run_plan = self.next_run_plan()
        next_run = (
            _parse_runtime_datetime(next_run_plan.get("scheduled_at"), None)
            if next_run_plan
            else None
        )
        weather_decision = self.last_decision
        if weather_decision and not is_plausible_celsius(weather_decision.max_temperature):
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
            "next_run_plan": next_run_plan,
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
