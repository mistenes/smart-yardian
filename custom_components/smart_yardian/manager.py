"""Runtime manager and safe irrigation scheduler."""

from __future__ import annotations

import asyncio
import logging
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
    CONF_LATITUDE,
    CONF_LONGITUDE,
    CONF_NOTIFY_SERVICE,
    CONF_OPENWEATHER_API_KEY,
    CONF_WEATHER_ENTITY,
    CONF_ZONE_ENTITIES,
    DOMAIN,
    MAX_QUEUE_DELAY_SECONDS,
    START_CONFIRM_SECONDS,
    STOP_CONFIRM_SECONDS,
)
from .irrigation import (
    ZoneProfile,
    reference_duration_minutes,
    seasonal_target,
)
from .models import IrrigationProgram, RunRecord, WeatherDecision
from .storage import SmartYardianStore
from .weather import (
    OpenWeatherClient,
    WeatherUnavailableError,
    evaluate_green_lawn,
    normalize_ha_forecast,
)

_LOGGER = logging.getLogger(__name__)


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
        self.weather = OpenWeatherClient(
            async_get_clientsession(hass),
            config[CONF_OPENWEATHER_API_KEY],
            float(config[CONF_LATITUDE]),
            float(config[CONF_LONGITUDE]),
        )
        self.status = "idle"
        self.active_run: dict[str, Any] | None = None
        self.last_decision: WeatherDecision | None = None
        self.last_error: str | None = None
        self._run_lock = asyncio.Lock()
        self._stop_event = asyncio.Event()
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
        added_profiles = False
        for entity_id in self.zone_entities:
            if entity_id not in self.store.zone_profiles:
                self.store.zone_profiles[entity_id] = ZoneProfile.default(entity_id)
                added_profiles = True
        if added_profiles:
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
                    self.async_run_program(program, local_now),
                    f"{DOMAIN}_program_{program.program_id}",
                )

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

    async def async_weather_decision(self) -> WeatherDecision:
        """Evaluate Időkép first and OpenWeather 4.0 second."""
        now = dt_util.utcnow()
        weather_entity = self.config[CONF_WEATHER_ENTITY]
        state = self.hass.states.get(weather_entity)
        idokep_error = "Az Időkép entitás nem érhető el."

        if state is not None:
            age = (now - state.last_updated).total_seconds()
            if age <= 90 * 60 and state.state not in ("unknown", "unavailable"):
                try:
                    response = await self.hass.services.async_call(
                        "weather",
                        "get_forecasts",
                        {"type": "hourly"},
                        target={ATTR_ENTITY_ID: weather_entity},
                        blocking=True,
                        return_response=True,
                    )
                    items = (response or {}).get(weather_entity, {}).get("forecast", [])
                    forecast = normalize_ha_forecast(items)
                    decision = evaluate_green_lawn(
                        forecast,
                        "Időkép",
                        now=now,
                        settings=self.store.settings,
                    )
                    self.last_decision = decision
                    self.last_error = None
                    self._notify_listeners()
                    return decision
                except (KeyError, TypeError, ValueError, WeatherUnavailableError) as err:
                    idokep_error = str(err)
            else:
                idokep_error = "Az Időkép adata régi vagy nem elérhető."

        try:
            forecast = await self.weather.async_fetch()
            decision = evaluate_green_lawn(
                forecast,
                "OpenWeather 4.0",
                now=now,
                settings=self.store.settings,
            )
            self.last_decision = decision
            self.last_error = None
            self._notify_listeners()
            return decision
        except WeatherUnavailableError as err:
            self.last_error = f"Időkép: {idokep_error} OpenWeather: {err}"
            self._notify_listeners()
            raise WeatherUnavailableError(self.last_error) from err

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
        }
        candidate = dict(self.store.settings)
        for key, value in settings.items():
            if key == "notify_mobile":
                candidate[key] = bool(value)
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
        self.store.settings = candidate
        await self.store.async_save()
        self._notify_listeners()

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
    ) -> None:
        """Run every zone safely under one global lock."""
        scheduled_at = scheduled_at or dt_util.now()
        apply_weather = (
            program.weather_adjustment if apply_weather is None else apply_weather
        )
        run_id = str(uuid4())
        uses_reference = any(
            zone.duration_mode == "reference" for zone in program.zones
        )
        uses_temperature_condition = program.temperature_condition_enabled

        try:
            async with asyncio.timeout(MAX_QUEUE_DELAY_SECONDS):
                async with self._run_lock:
                    await self._async_wait_for_external_irrigation()
                    decision = (
                        await self.async_weather_decision()
                        if apply_weather
                        or uses_reference
                        or uses_temperature_condition
                        else WeatherDecision(
                            factor=1.0,
                            source="Kézi, korrekció nélkül",
                            precipitation_mm=0,
                            max_probability=0,
                            max_temperature=0,
                            sunny_hours=0,
                            rainy_hours=0,
                            reason="A program kézi, időjárás-korrekció nélküli futás.",
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
                    await self._async_execute_program(
                        run_id, program, scheduled_at, decision
                    )
        except TimeoutError:
            await self._async_record_skip(
                program,
                scheduled_at,
                "A rendszer 30 percnél tovább volt foglalt.",
            )
        except WeatherUnavailableError as err:
            await self._async_record_skip(
                program,
                scheduled_at,
                f"Bizonytalan időjárási adat: {err}",
            )

    async def _async_execute_program(
        self,
        run_id: str,
        program: IrrigationProgram,
        scheduled_at: datetime,
        decision: WeatherDecision,
    ) -> None:
        """Execute the program while holding the run lock."""
        self._stop_event.clear()
        started = dt_util.utcnow()
        zone_results: list[dict[str, Any]] = []
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
            "zones": zone_results,
        }
        self.store.runtime["active_run"] = self.active_run
        await self.store.async_save()
        self._notify_listeners()

        outcome = "completed"
        reason = decision.reason
        try:
            for zone in program.zones:
                if self._stop_event.is_set():
                    outcome = "stopped"
                    reason = "A futást a felhasználó leállította."
                    break
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
                        "application_rate_mm_h": round(
                            profile.effective_rate_mm_h, 2
                        ),
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
                result = {
                    "entity_id": zone.entity_id,
                    "base_minutes": base_minutes,
                    "planned_minutes": duration,
                    "outcome": "running",
                    **calculation,
                }
                zone_results.append(result)
                self.active_run["current_zone"] = zone.entity_id
                self.active_run["current_duration"] = duration
                self.active_run["zone_started_at"] = dt_util.utcnow().isoformat()
                await self.store.async_save()
                self._notify_listeners()
                await self._async_start_zone(zone.entity_id, duration)
                stopped_early = await self._async_wait_duration(duration)
                await self._async_stop_zone(zone.entity_id)
                result["outcome"] = "stopped" if stopped_early else "completed"
                if stopped_early:
                    outcome = "stopped"
                    reason = "A futást a felhasználó leállította."
                    break
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
            )
            self.store.runtime.pop("active_run", None)
            await self.store.async_add_history(record.as_dict())
            self.active_run = None
            if self.status != "error":
                self.status = "idle"
            self._notify_listeners()

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
        if state is None or state.state == "unavailable":
            raise RuntimeError(f"A zóna nem érhető el: {entity_id}")
        await self.hass.services.async_call(
            "yardian",
            "start_irrigation",
            {"duration": duration},
            target={ATTR_ENTITY_ID: entity_id},
            blocking=True,
        )
        if not await self._async_wait_state(entity_id, True, START_CONFIRM_SECONDS):
            raise RuntimeError(f"A zóna nem igazolta vissza az indítást: {entity_id}")

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
        while asyncio.get_running_loop().time() < deadline:
            state = self.hass.states.get(entity_id)
            if state is not None and (state.state == STATE_ON) == expected_on:
                return True
            await asyncio.sleep(1)
        return False

    async def _async_wait_duration(self, duration_minutes: int) -> bool:
        try:
            await asyncio.wait_for(
                self._stop_event.wait(),
                timeout=duration_minutes * 60,
            )
            return True
        except TimeoutError:
            return False

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
        active = [
            entity_id
            for entity_id in self.zone_entities
            if (state := self.hass.states.get(entity_id)) is not None
            and state.state == STATE_ON
        ]
        if active:
            await self.hass.services.async_call(
                "homeassistant",
                "turn_off",
                {},
                target={ATTR_ENTITY_ID: active},
                blocking=True,
            )
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
                    "available": True,
                    "zones": [],
                },
            )
            zone = {
                "entity_id": entity_id,
                "name": state.name if state else entity_id,
                "state": state.state if state else "unavailable",
                "available": state is not None and state.state != "unavailable",
                "profile": self.zone_profile(entity_id).as_dict(),
            }
            controller["zones"].append(zone)
            controller["available"] = controller["available"] and zone["available"]

        next_run = self.next_run()
        target = (
            seasonal_target(self.last_decision.max_temperature).as_dict()
            if self.last_decision
            else None
        )
        return {
            "status": self.status,
            "automation_enabled": self.store.settings.get("automation_enabled", True),
            "paused_until": self.store.settings.get("paused_until"),
            "controllers": list(controllers.values()),
            "programs": [program.as_dict() for program in self.store.programs],
            "history": list(reversed(self.store.history[-20:])),
            "settings": self.store.settings,
            "active_run": self.active_run,
            "weather": self.last_decision.as_dict() if self.last_decision else None,
            "last_error": self.last_error,
            "next_run": next_run.isoformat() if next_run else None,
            "seasonal_target": target,
        }
