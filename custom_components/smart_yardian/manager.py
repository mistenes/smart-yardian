"""Runtime manager and safe irrigation scheduler."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, date, datetime, timedelta
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
from .water_balance import (
    AdaptiveBalance,
    account_daily_balance,
    choose_irrigation_target,
    defer_window,
    forecast_rain_in_horizon,
    settle_completed_irrigation,
    settle_soil_satisfied_need,
    should_defer_watering,
    target_depth_candidates,
)
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
MAX_PLAUSIBLE_DAILY_ETC_MM = 20.0
SOIL_MOISTURE_MAX_AGE_SECONDS = 12 * 60 * 60


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
        self._adaptive_account_attempted_at: datetime | None = None
        self._run_lock = asyncio.Lock()
        self._delayed_lock = asyncio.Lock()
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
            # Expose the persisted run to async_stop_all so the last known
            # current zone is stopped even when its HA state is stale.
            self.active_run = interrupted
            await self.async_stop_all()
            interrupted_completed_at = dt_util.utcnow()
            self._finalize_interrupted_zone_progress(
                interrupted,
                interrupted_completed_at,
            )
            interrupted_applied_mm = self._completed_adaptive_depth(
                list(interrupted.get("zones") or [])
            )
            if interrupted_applied_mm > 0 and interrupted.get("program_id"):
                settled = settle_completed_irrigation(
                    self._adaptive_balance(str(interrupted["program_id"])),
                    interrupted_applied_mm,
                    interrupted_completed_at,
                )
                self._set_adaptive_balance(str(interrupted["program_id"]), settled)
            interrupted_reason = (
                "A Home Assistant újraindult; a futás biztonságosan leállt."
            )
            if interrupted_applied_mm > 0:
                interrupted_reason += (
                    f" A restart előtt befejezett zónák becsült kijuttatása "
                    f"{interrupted_applied_mm:g} mm volt; ezt a vízmérleg elszámolta."
                )
            record = RunRecord(
                run_id=str(interrupted.get("run_id") or uuid4()),
                program_id=interrupted.get("program_id"),
                program_name=str(interrupted.get("program_name") or "Ismeretlen program"),
                scheduled_at=str(interrupted.get("scheduled_at") or dt_util.utcnow().isoformat()),
                started_at=interrupted.get("started_at"),
                completed_at=interrupted_completed_at.isoformat(),
                outcome="interrupted",
                reason=interrupted_reason,
                factor=float(interrupted.get("factor") or 1),
                weather_source=str(interrupted.get("weather_source") or "ismeretlen"),
                zones=list(interrupted.get("zones") or []),
                weather=interrupted.get("weather"),
            )
            self.store.runtime.pop("active_run", None)
            await self.store.async_add_history(record.as_dict())
            self.active_run = None
            await self.async_notify(record.reason, "Öntözés megszakítva")
        self._create_task(
            self._async_prime_idokep_forecast(dt_util.as_local(dt_util.now())),
            f"{DOMAIN}_forecast_prime",
        )

    def _finalize_interrupted_zone_progress(
        self,
        interrupted: dict[str, Any],
        stopped_at: datetime,
    ) -> None:
        """Conservatively account the persisted current zone up to restart stop."""
        zones = list(interrupted.get("zones") or [])
        if not zones:
            return
        try:
            index = int(interrupted.get("current_index"))
        except (TypeError, ValueError):
            index = -1
        current_entity = str(interrupted.get("current_zone") or "")
        if not 0 <= index < len(zones) or (
            current_entity
            and str(zones[index].get("entity_id") or "") != current_entity
        ):
            index = next(
                (
                    candidate
                    for candidate, zone in enumerate(zones)
                    if str(zone.get("entity_id") or "") == current_entity
                ),
                -1,
            )
        if index < 0 or zones[index].get("outcome") != "running":
            return
        if stopped_at.tzinfo is None:
            stopped_at = stopped_at.replace(tzinfo=UTC)
        started_at = _parse_runtime_datetime(
            interrupted.get("zone_confirmed_started_at")
            or interrupted.get("zone_started_at"),
            stopped_at,
        )
        if started_at is None:
            return
        started_at = started_at.astimezone(stopped_at.tzinfo)
        elapsed_seconds = max(0.0, (stopped_at - started_at).total_seconds())
        duration = max(
            1,
            int(
                interrupted.get("current_duration")
                or zones[index].get("planned_minutes")
                or 1
            ),
        )
        self._apply_elapsed_zone_delivery(
            zones[index],
            duration,
            elapsed_seconds,
            "stopped",
        )

    @staticmethod
    def _apply_elapsed_zone_delivery(
        result: dict[str, Any],
        duration_minutes: int,
        elapsed_seconds: float,
        outcome: str,
    ) -> None:
        """Freeze confirmed physical delivery while preserving the soil share."""
        duration_seconds = max(1.0, float(duration_minutes) * 60.0)
        actual_seconds = (
            duration_seconds
            if outcome == "completed"
            else min(duration_seconds, max(0.0, float(elapsed_seconds)))
        )
        delivered_ratio = min(1.0, actual_seconds / duration_seconds)
        result["actual_duration_seconds"] = round(actual_seconds, 1)
        if result.get("adaptive_applied_mm") is not None:
            result["adaptive_applied_mm"] = round(
                max(0.0, float(result["adaptive_applied_mm"])) * delivered_ratio,
                3,
            )
        result["outcome"] = outcome

    def _mark_terminal_run(self, run_key: str | None) -> None:
        """Persistently suppress another hardware execution for one run key."""
        if not run_key:
            return
        terminal_keys = [
            str(item)
            for item in self.store.runtime.get("terminal_run_keys") or []
            if str(item) != run_key
        ]
        terminal_keys.append(run_key)
        self.store.runtime["terminal_run_keys"] = terminal_keys[-500:]

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
        terminal_keys = {
            str(item)
            for item in self.store.runtime.get("terminal_run_keys") or []
        }
        recovered: list[dict[str, Any]] = []
        changed = False
        for raw in delayed_runs:
            item = dict(raw)
            if str(item.get("run_key") or "") in terminal_keys:
                changed = True
                continue
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
        self._create_task(
            self._async_account_adaptive_balances(local_now),
            f"{DOMAIN}_water_balance_{local_now.date().isoformat()}",
        )
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
        delayed_lock = getattr(self, "_delayed_lock", None)
        if delayed_lock is not None:
            if delayed_lock.locked():
                return
            await delayed_lock.acquire()
        elif getattr(self, "_delayed_claiming", False):
            # Compatibility fallback for recovery tests/legacy manager objects.
            return
        self._delayed_claiming = True
        snapshot_identities = {
            (
                str(item.get("run_key") or ""),
                str(item.get("claim_id") or ""),
                str(item.get("scheduled_at") or ""),
            )
            for item in delayed_runs
        }
        terminal_keys = {
            str(item)
            for item in self.store.runtime.get("terminal_run_keys") or []
        }
        remaining: list[dict[str, Any]] = []
        claimed: list[
            tuple[
                IrrigationProgram,
                str,
                str,
                datetime,
                datetime | None,
                float | None,
            ]
        ] = []
        expired_records: list[tuple[IrrigationProgram, datetime, str]] = []
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

            if run_key in terminal_keys:
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
                expired_records.append(
                    (
                        program,
                        delayed_at,
                        "Az intelligens öntözési időablak bezárult."
                        if is_smart
                        else "A szél miatt halasztott futás már nem aktuális.",
                    )
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
            try:
                adaptive_target_mm = (
                    float(item["adaptive_target_mm"])
                    if item.get("adaptive_target_mm") not in (None, "")
                    else None
                )
            except (TypeError, ValueError):
                adaptive_target_mm = None
            if (
                adaptive_target_mm is not None
                and original_scheduled_at is not None
                and original_scheduled_at.date() != local_now.date()
            ):
                # An overnight plan must absorb the new calendar day's ET when
                # it becomes due; yesterday's persisted target is not an upper
                # bound on today's freshly evaluated water debt.
                adaptive_target_mm = None
            claimed.append(
                (
                    program,
                    run_key,
                    claim_id,
                    original_scheduled_at or delayed_at,
                    window_end_at,
                    adaptive_target_mm,
                )
            )
            changed = True

        if changed:
            concurrent_additions = []
            for current in list(self.store.runtime.get("delayed_runs") or []):
                identity = (
                    str(current.get("run_key") or ""),
                    str(current.get("claim_id") or ""),
                    str(current.get("scheduled_at") or ""),
                )
                if identity not in snapshot_identities:
                    concurrent_additions.append(dict(current))
            replacement_keys = {
                str(item.get("run_key") or "") for item in concurrent_additions
            }
            remaining = [
                item
                for item in remaining
                if str(item.get("run_key") or "") not in replacement_keys
            ]
            remaining.extend(concurrent_additions)
            self.store.runtime["delayed_runs"] = remaining
            try:
                await self.store.async_save()
            except BaseException:  # noqa: BLE001 - never leave the claim lock held
                self._delayed_claiming = False
                if delayed_lock is not None:
                    delayed_lock.release()
                raise
        self._delayed_claiming = False
        if delayed_lock is not None:
            delayed_lock.release()
        if changed:
            self._notify_listeners()
        for expired_program, expired_at, expired_reason in expired_records:
            await self._async_record_skip(
                expired_program,
                expired_at,
                expired_reason,
            )
        for (
            program,
            run_key,
            claim_id,
            original_at,
            window_end_at,
            adaptive_target_mm,
        ) in claimed:
            if adaptive_target_mm is None:
                delayed_coro = self._async_run_claimed_delayed(
                    program,
                    local_now,
                    run_key,
                    claim_id,
                    original_at,
                    window_end_at,
                )
            else:
                delayed_coro = self._async_run_claimed_delayed(
                    program,
                    local_now,
                    run_key,
                    claim_id,
                    original_at,
                    window_end_at,
                    adaptive_target_mm=adaptive_target_mm,
                )
            self._create_task(
                delayed_coro,
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
        adaptive_target_mm: float | None = None,
    ) -> None:
        """Run one durable claim and only remove the exact claimed record."""
        remove_claim = False
        cancelled = False
        try:
            run_kwargs: dict[str, Any] = {}
            if adaptive_target_mm is not None:
                run_kwargs["adaptive_target_mm"] = adaptive_target_mm
            await self.async_run_program(
                program,
                evaluation_at,
                allow_wind_delay=True,
                run_key=run_key,
                original_scheduled_at=original_scheduled_at,
                window_end_at=window_end_at,
                **run_kwargs,
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

    def _adaptive_balance(self, program_id: str) -> AdaptiveBalance:
        """Return one program's durable adaptive water ledger."""
        balances = self.store.runtime.get("adaptive_balances") or {}
        raw = balances.get(program_id) if isinstance(balances, dict) else None
        return AdaptiveBalance.from_dict(raw if isinstance(raw, dict) else None)

    def _set_adaptive_balance(
        self,
        program_id: str,
        balance: AdaptiveBalance,
    ) -> None:
        """Update one in-memory adaptive ledger without an implicit save."""
        raw_balances = self.store.runtime.get("adaptive_balances") or {}
        balances = dict(raw_balances) if isinstance(raw_balances, dict) else {}
        balances[program_id] = balance.as_dict()
        self.store.runtime["adaptive_balances"] = balances

    def _defer_adaptive_once(
        self,
        program: IrrigationProgram,
        state: AdaptiveBalance,
        run_key: str | None,
        service_at: datetime,
    ) -> AdaptiveBalance:
        """Count one allowed window once across retries and HA restarts."""
        key = run_key or (
            f"{program.program_id}:{service_at.date().isoformat()}:smart_window"
        )
        raw = self.store.runtime.get("adaptive_deferred_keys") or {}
        deferred_keys = dict(raw) if isinstance(raw, dict) else {}
        program_keys = [str(item) for item in deferred_keys.get(program.program_id, [])]
        if key in program_keys:
            return state
        program_keys.append(key)
        deferred_keys[program.program_id] = program_keys[-60:]
        self.store.runtime["adaptive_deferred_keys"] = deferred_keys
        updated = defer_window(state)
        self._set_adaptive_balance(program.program_id, updated)
        return updated

    def _decision_daily_etc(self, decision: WeatherDecision) -> float:
        """Return a safe daily crop-water demand used by the ledger."""
        target = decision.irrigation_target_mm
        if target is None:
            adjusted = max(0.0, float(decision.adjusted_et0_mm or 0.0))
            target = adjusted * max(
                0.0,
                float(self.store.settings.get("et_crop_coefficient", 0.85)),
            )
        # Keep the daily climate ledger independent of the per-event delivery
        # cap: a 2 mm event limit must not erase a genuine 5 mm daily demand.
        return round(max(0.0, min(float(target), MAX_PLAUSIBLE_DAILY_ETC_MM)), 3)

    def _program_effective_exposure(self, program: IrrigationProgram) -> float:
        """Return the program's conversion from physical to full-sun ledger mm."""
        factors = [
            (
                self.zone_profile(zone.entity_id).exposure_factor
                if zone.duration_mode == "reference"
                else 1.0
            )
            for zone in program.zones
        ]
        return max(0.1, sum(factors) / len(factors)) if factors else 1.0

    def _account_adaptive_program(
        self,
        program: IrrigationProgram,
        accounting_date: date,
        decision: WeatherDecision,
        effective_rain_mm: float | None = None,
    ) -> tuple[AdaptiveBalance, float, bool]:
        """Apply one daily weather delta to one smart program idempotently."""
        previous = self._adaptive_balance(program.program_id)
        ledger_rain_mm = (
            0.0
            if effective_rain_mm is None
            else effective_rain_mm / self._program_effective_exposure(program)
        )
        updated, delta = account_daily_balance(
            previous,
            accounting_date,
            self._decision_daily_etc(decision),
            ledger_rain_mm,
            float(
                self.store.settings.get(
                    "water_balance_max_rain_credit_mm",
                    15.0,
                )
            ),
        )
        changed = updated != previous
        if changed:
            self._set_adaptive_balance(program.program_id, updated)
        return updated, delta, changed

    def _adaptive_effective_rain(
        self,
        decision: WeatherDecision,
        accounting_date: date,
    ) -> tuple[float, bool]:
        """Accumulate positive changes of the rolling 24-hour station value."""
        raw = self.store.runtime.get("adaptive_rain_accounting") or {}
        accounting = dict(raw) if isinstance(raw, dict) else {}
        raw_days = accounting.get("days") or {}
        days = dict(raw_days) if isinstance(raw_days, dict) else {}
        day_key = accounting_date.isoformat()
        observed = max(0.0, float(decision.observed_precipitation_mm or 0.0))
        station = str(decision.rain_station or "")
        if not station:
            # A transient missing station sample must not erase the rolling
            # baseline: otherwise its return would book the same 24 h total twice.
            return round(max(0.0, float(days.get(day_key, 0.0))), 3), False
        previous_station = str(accounting.get("station") or "")
        previous_measured = accounting.get("last_measured_mm")
        if previous_measured is None:
            observed_delta = observed
        elif station != previous_station:
            # Establish a new station baseline without crediting the same
            # rolling 24 h rainfall a second time.
            observed_delta = 0.0
        else:
            observed_delta = max(0.0, observed - float(previous_measured))
        previous_day_total = max(0.0, float(days.get(day_key, 0.0)))
        day_total = round(previous_day_total + observed_delta, 3)
        days[day_key] = day_total
        # Only a few days are useful for idempotency and preview diagnostics.
        accounting["days"] = dict(sorted(days.items())[-7:])
        accounting["station"] = station
        accounting["last_measured_mm"] = round(observed, 3)
        accounting["last_measured_date"] = day_key
        changed = bool(
            day_total != previous_day_total
            or previous_measured is None
            or round(float(previous_measured), 3) != round(observed, 3)
            or station != previous_station
        )
        self.store.runtime["adaptive_rain_accounting"] = accounting
        return day_total, changed

    async def _async_notify_adaptive_rebaseline_once(
        self,
        program: IrrigationProgram,
        balance: AdaptiveBalance,
    ) -> None:
        """Explain one automatic safe reset after a long HA/weather-data gap."""
        rebaseline_date = balance.last_rebaseline_date
        if not balance.rebaselined_after_gap or rebaseline_date is None:
            return
        key = f"{program.program_id}:{rebaseline_date.isoformat()}"
        notified = [
            str(item)
            for item in self.store.runtime.get("adaptive_rebaseline_notifications") or []
        ]
        if key in notified:
            return
        notified.append(key)
        self.store.runtime["adaptive_rebaseline_notifications"] = notified[-100:]
        await self.store.async_save()
        await self.async_notify(
            (
                f"A(z) {program.name} vízmérlege {balance.last_gap_days} napos "
                "adatkimaradás után biztonságosan újraindult. A bizonytalan régi "
                "egyenleget a rendszer eldobta, és csak az aktuális nap becsült "
                "párolgását, valamint mért esőjét vette alapul."
            ),
            "Smart Yardian vízmérleg újraindítva",
        )

    async def _async_account_adaptive_balances(self, local_now: datetime) -> None:
        """Account today's ET and rain once even when no window is enabled today."""
        programs = [
            program
            for program in self.store.programs
            if program.enabled
            and program.schedule_mode == "smart_window"
            and self._smart_overlap_owner(program) == program.program_id
        ]
        if not programs:
            return
        attempted_at = self._adaptive_account_attempted_at
        if (
            attempted_at is not None
            and (dt_util.utcnow() - attempted_at).total_seconds()
            < IDOKEP_FORECAST_PRIME_SECONDS
        ):
            return
        self._adaptive_account_attempted_at = dt_util.utcnow()
        try:
            decision = await self.async_weather_decision(local_now)
        except WeatherUnavailableError:
            # Fail-safe: do not guess or advance last_accounted_date.  A later
            # minute tick will retry while fixed programs remain unaffected.
            return
        effective_rain, rain_changed = self._adaptive_effective_rain(
            decision,
            local_now.date(),
        )
        changed = rain_changed
        rebaselined: list[tuple[IrrigationProgram, AdaptiveBalance]] = []
        for program in programs:
            previous_rebaseline = self._adaptive_balance(
                program.program_id
            ).last_rebaseline_date
            updated, _, program_changed = self._account_adaptive_program(
                program,
                local_now.date(),
                decision,
                effective_rain,
            )
            changed = changed or program_changed
            if (
                updated.last_rebaseline_date is not None
                and updated.last_rebaseline_date != previous_rebaseline
            ):
                rebaselined.append((program, updated))
        if changed:
            await self.store.async_save()
            self._notify_listeners()
        for program, balance in rebaselined:
            await self._async_notify_adaptive_rebaseline_once(program, balance)

    def _future_rain_after_accounted_day(
        self,
        forecast: list[ForecastHour],
        evaluated_at: datetime,
    ) -> float:
        """Return forecast rain ahead; the persistent ledger uses measured rain only."""
        if evaluated_at.tzinfo is None:
            evaluated_at = evaluated_at.replace(tzinfo=UTC)
        horizon_hours = max(
            1,
            int(self.store.settings.get("water_balance_rain_lookahead_hours", 36)),
        )
        return forecast_rain_in_horizon(forecast, evaluated_at, horizon_hours)

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
                        "HomeAssistant SmartYardian/0.18.0 "
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
                        "HomeAssistant SmartYardian/0.18.0 "
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
                    "humidity_percent": (
                        round(hour.humidity_percent)
                        if hour.humidity_percent is not None
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
        executed = set(self.store.runtime.get("executed") or [])
        delayed_keys = {
            str(item.get("run_key") or "") for item in self.store.runtime.get("delayed_runs") or []
        }
        delayed_plans = {
            str(item.get("run_key") or ""): dict(item)
            for item in self.store.runtime.get("delayed_runs") or []
            if item.get("planning_status") == "smart_planned"
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
        if any(
            program.schedule_mode == "smart_window"
            for program in self.store.programs
        ):
            for day in days:
                forecast_date = date.fromisoformat(str(day["date"]))
                weather_days[forecast_date.isoformat()] = datetime.combine(
                    forecast_date,
                    now.timetz(),
                )
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
        preview_adaptive_balances = {
            program.program_id: self._adaptive_balance(program.program_id)
            for program in self.store.programs
            if program.schedule_mode == "smart_window"
        }

        for occurrence in occurrences:
            program = occurrence.program
            occurrence_run_key = self._program_run_key(occurrence)
            persisted_plan = delayed_plans.get(occurrence_run_key)
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
            adaptive_deferred = False
            adaptive_reason: str | None = None
            adaptive_conflict = bool(
                program.schedule_mode == "smart_window"
                and self._smart_overlap_owner(program) != program.program_id
            )
            water_balance_before_mm: float | None = None
            daily_water_need_mm: float | None = None
            daily_effective_rain_mm: float | None = None
            daily_ledger_rain_mm: float | None = None
            forecast_rain_mm: float | None = None
            forecast_ledger_rain_mm: float | None = None
            irrigation_target_mm: float | None = None
            remaining_balance_mm: float | None = None
            water_balance_gap_days: int | None = None
            water_balance_backfilled_gap_days: int | None = None
            water_balance_unaccounted_gap_days: int | None = None
            water_balance_rebaselined_after_gap: bool | None = None
            water_balance_last_rebaseline_date: str | None = None

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
                    or (
                        decision.factor == 0
                        and program.schedule_mode != "smart_window"
                    )
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

            if (
                program.schedule_mode == "smart_window"
                and decision is not None
                and not adaptive_conflict
            ):
                adaptive_state = preview_adaptive_balances[program.program_id]
                effective_exposure = self._program_effective_exposure(program)
                first_date = (
                    now.date()
                    if adaptive_state.last_accounted_date is None
                    or adaptive_state.last_accounted_date <= now.date()
                    else adaptive_state.last_accounted_date + timedelta(days=1)
                )
                cursor = max(first_date, now.date())
                while cursor <= target_at.date():
                    cursor_decision = day_decisions.get(cursor.isoformat())
                    if cursor_decision is None:
                        weather_error = day_errors.get(
                            cursor.isoformat(),
                            "Időkép: nincs napi előrejelzés.",
                        )
                        break
                    effective_rain = self._preview_effective_rain(
                        cursor_decision,
                        cursor,
                        now.date(),
                    )
                    adaptive_state, _, _ = self._preview_account_balance(
                        program,
                        adaptive_state,
                        cursor,
                        cursor_decision,
                        effective_rain,
                    )
                    cursor += timedelta(days=1)
                preview_adaptive_balances[program.program_id] = adaptive_state
                water_balance_gap_days = adaptive_state.last_gap_days
                water_balance_backfilled_gap_days = adaptive_state.backfilled_gap_days
                water_balance_unaccounted_gap_days = adaptive_state.unaccounted_gap_days
                water_balance_rebaselined_after_gap = (
                    adaptive_state.rebaselined_after_gap
                )
                water_balance_last_rebaseline_date = (
                    adaptive_state.last_rebaseline_date.isoformat()
                    if adaptive_state.last_rebaseline_date is not None
                    else None
                )
                effective_target_day_rain = self._preview_effective_rain(
                    decision,
                    target_at.date(),
                    now.date(),
                )
                if adaptive_state.last_accounted_date == target_at.date():
                    daily_water_need_mm = round(
                        adaptive_state.last_daily_etc_mm,
                        2,
                    )
                    daily_effective_rain_mm = round(
                        effective_target_day_rain,
                        2,
                    )
                    daily_ledger_rain_mm = round(
                        adaptive_state.last_daily_measured_rain_mm,
                        2,
                    )
                else:
                    daily_water_need_mm = round(
                        self._decision_daily_etc(decision),
                        2,
                    )
                    daily_effective_rain_mm = round(
                        effective_target_day_rain,
                        2,
                    )
                    daily_ledger_rain_mm = round(
                        effective_target_day_rain / effective_exposure,
                        2,
                    )
                water_balance_before_mm = round(adaptive_state.balance_mm, 2)
                if idokep_forecast is not None:
                    preview_lead_hours = max(
                        0,
                        ceil((target_at - now).total_seconds() / 3600),
                    )
                    forecast_rain_mm = forecast_rain_in_horizon(
                        idokep_forecast,
                        now,
                        preview_lead_hours
                        + int(
                            self.store.settings.get(
                                "water_balance_rain_lookahead_hours",
                                36,
                            )
                        ),
                    )
                else:
                    forecast_rain_mm = 0.0
                forecast_ledger_rain_mm = round(
                    forecast_rain_mm / effective_exposure,
                    3,
                )
                adaptive_deferred, adaptive_reason = should_defer_watering(
                    adaptive_state.balance_mm,
                    forecast_ledger_rain_mm,
                    adaptive_state.deferred_windows,
                    float(
                        self.store.settings.get("water_balance_min_mm", 5.0)
                    ),
                    int(
                        self.store.settings.get(
                            "water_balance_max_defer_windows",
                            2,
                        )
                    ),
                )
                if adaptive_deferred:
                    irrigation_target_mm = 0.0
                else:
                    irrigation_target_mm = choose_irrigation_target(
                        adaptive_state.balance_mm - forecast_ledger_rain_mm,
                        float(
                            self.store.settings.get(
                                "water_balance_max_event_mm",
                                10.0,
                            )
                        ),
                    )
                    if irrigation_target_mm < 0.5:
                        adaptive_deferred = True
                        adaptive_reason = (
                            "A nettó vízhiány még nem ér el 0,5 mm kijuttatható "
                            "részöntözést."
                        )
                        irrigation_target_mm = 0.0
                if (
                    not adaptive_deferred
                    and persisted_plan is not None
                    and persisted_plan.get("adaptive_target_mm") not in (None, "")
                ):
                    try:
                        persisted_target_mm = max(
                            0.0,
                            float(persisted_plan["adaptive_target_mm"]),
                        )
                    except (TypeError, ValueError):
                        persisted_target_mm = None
                    if persisted_target_mm is not None:
                        irrigation_target_mm = min(
                            irrigation_target_mm,
                            persisted_target_mm,
                        )
                remaining_balance_mm = round(
                    adaptive_state.balance_mm - irrigation_target_mm,
                    2,
                )

            zones = [
                self._preview_zone(
                    zone,
                    decision,
                    program.weather_adjustment,
                    program.soil_moisture_enabled,
                    adaptive_target_mm=(
                        irrigation_target_mm
                        if program.schedule_mode == "smart_window"
                        else None
                    ),
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
            using_persisted_plan = False
            planning_status: str | None = None
            planned_at = occurrence.scheduled_at
            planned_end_at: datetime | None = None
            selection_reason: str | None = None
            if program.schedule_mode == "smart_window":
                planning_status = (
                    "smart_zone_conflict"
                    if adaptive_conflict
                    else "water_need_deferred"
                    if adaptive_deferred
                    else "smart_waiting_forecast"
                )
                selection_reason = adaptive_reason
                if (
                    not adaptive_conflict
                    and not adaptive_deferred
                    and decision is not None
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
                    persisted_choice = self._persisted_preview_choice(
                        persisted_plan,
                        occurrence,
                        now,
                        total_minutes,
                    )
                    if persisted_choice is not None:
                        smart_choice = persisted_choice
                        using_persisted_plan = True
                    elif irrigation_target_mm is not None:
                        adaptive_target_candidates = target_depth_candidates(
                            irrigation_target_mm
                        )
                        (
                            irrigation_target_mm,
                            zones,
                            total_minutes,
                            smart_choice,
                        ) = self._preview_adaptive_slot(
                            program,
                            decision,
                            irrigation_target_mm,
                            idokep_forecast,
                            occurrence.window_start_at,
                            occurrence.window_end_at,
                            planning_not_before,
                            blocked_intervals,
                            candidate_targets=adaptive_target_candidates,
                        )
                        remaining_balance_mm = round(
                            (water_balance_before_mm or 0.0)
                            - irrigation_target_mm,
                            2,
                        )
                    else:
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
                                        adaptive_target_mm=irrigation_target_mm,
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
                                        adaptive_target_mm=irrigation_target_mm,
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
                                if using_persisted_plan:
                                    # The persisted start is the durable plan shown
                                    # by next_run_plan.  Weather and durations are
                                    # refreshed for transparency, but preview does
                                    # not silently move that start again.
                                    pass
                                elif total_minutes and total_minutes > 0:
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
            elif adaptive_conflict:
                status = "smart_zone_conflict"
                reason = (
                    "Ez egy régi, ütköző intelligens program: legalább egy zónáját "
                    "másik smart program is használja, ezért nem indul el."
                )
            elif weather_error:
                status = "weather_unavailable"
                reason = f"Nincs elég megbízható előrejelzés. {weather_error}"
            elif decision and not program.temperature_condition_matches(decision.max_temperature):
                status = "condition_skip"
                reason = program.temperature_condition_reason(decision.max_temperature)
            elif adaptive_deferred:
                status = "water_need_deferred"
                reason = adaptive_reason or (
                    "Ebben az engedélyezett időablakban nem szükséges öntözni."
                )
            elif (
                decision
                and program.schedule_mode != "smart_window"
                and program.weather_adjustment
                and decision.factor == 0
            ):
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

            if program.schedule_mode == "smart_window":
                simulated_state = preview_adaptive_balances[program.program_id]
                if status == "water_need_deferred":
                    preview_adaptive_balances[program.program_id] = defer_window(
                        simulated_state
                    )
                    remaining_balance_mm = round(simulated_state.balance_mm, 2)
                elif (
                    status == "will_run"
                    and smart_choice is not None
                    and smart_choice.status == "planned"
                    and irrigation_target_mm is not None
                    and irrigation_target_mm > 0
                ):
                    planned_applied_mm = self._planned_adaptive_depth(zones)
                    preview_adaptive_balances[program.program_id] = (
                        settle_completed_irrigation(
                            simulated_state,
                            planned_applied_mm,
                            planned_at,
                        )
                    )
                    remaining_balance_mm = round(
                        simulated_state.balance_mm - planned_applied_mm,
                        2,
                    )
                elif (
                    status == "moisture_skip"
                    and irrigation_target_mm is not None
                    and irrigation_target_mm > 0
                ):
                    planned_satisfied_mm = self._planned_adaptive_depth(zones)
                    preview_adaptive_balances[program.program_id] = (
                        settle_soil_satisfied_need(
                            simulated_state,
                            planned_satisfied_mm,
                        )
                    )
                    remaining_balance_mm = round(
                        simulated_state.balance_mm - planned_satisfied_mm,
                        2,
                    )
                else:
                    remaining_balance_mm = round(simulated_state.balance_mm, 2)

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
                "water_balance_before_mm": water_balance_before_mm,
                "daily_water_need_mm": daily_water_need_mm,
                "daily_effective_rain_mm": daily_effective_rain_mm,
                "daily_ledger_rain_mm": daily_ledger_rain_mm,
                "forecast_rain_mm": forecast_rain_mm,
                "forecast_ledger_rain_mm": forecast_ledger_rain_mm,
                "irrigation_target_mm": irrigation_target_mm,
                "remaining_balance_mm": remaining_balance_mm,
                "water_balance_gap_days": water_balance_gap_days,
                "water_balance_backfilled_gap_days": water_balance_backfilled_gap_days,
                "water_balance_unaccounted_gap_days": (
                    water_balance_unaccounted_gap_days
                ),
                "water_balance_rebaselined_after_gap": (
                    water_balance_rebaselined_after_gap
                ),
                "water_balance_last_rebaseline_date": (
                    water_balance_last_rebaseline_date
                ),
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
        adaptive_target_mm: float | None = None,
    ) -> dict[str, Any]:
        """Calculate one zone without starting hardware."""
        state = self.hass.states.get(zone.entity_id)
        duration: int | None
        if adaptive_target_mm is not None and adaptive_target_mm <= 0:
            duration = 0
        elif adaptive_target_mm is not None and zone.duration_mode == "reference":
            duration = reference_duration_for_depth(
                self.zone_profile(zone.entity_id),
                adaptive_target_mm,
            )
        elif adaptive_target_mm is not None:
            reference_mm = max(
                0.1,
                float(self.store.settings.get("et_reference_mm", 5.0)),
            )
            duration = max(
                1,
                min(
                    180,
                    round(zone.duration_minutes * adaptive_target_mm / reference_mm),
                ),
            )
        elif apply_weather and decision is not None and decision.factor == 0:
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
            pre_moisture_minutes = duration
            duration = adjust_duration_for_soil_moisture(
                duration,
                float(moisture["moisture_factor"]),
            )
        else:
            pre_moisture_minutes = None
        adaptive_applied_mm = self._zone_adaptive_depth(
            zone,
            adaptive_target_mm,
            duration,
        )
        adaptive_satisfied_mm, adaptive_soil_satisfied_mm = (
            self._adaptive_satisfaction_depths(
                adaptive_target_mm,
                adaptive_applied_mm,
                str(moisture["moisture_action"]),
            )
        )
        return {
            "entity_id": zone.entity_id,
            "name": state.name if state else zone.entity_id,
            "duration_mode": zone.duration_mode,
            "pre_moisture_minutes": pre_moisture_minutes,
            "planned_minutes": duration,
            "adaptive_applied_mm": adaptive_applied_mm,
            "adaptive_satisfied_mm": adaptive_satisfied_mm,
            "adaptive_soil_satisfied_mm": adaptive_soil_satisfied_mm,
            **moisture,
        }

    def _zone_adaptive_depth(
        self,
        zone: ProgramZone,
        target_mm: float | None,
        planned_minutes: int | None,
    ) -> float | None:
        """Estimate the physical depth represented by one adaptive zone plan."""
        if target_mm is None or planned_minutes is None:
            return None
        if planned_minutes <= 0:
            return 0.0
        if zone.duration_mode == "reference":
            profile = self.zone_profile(zone.entity_id)
            physical_depth = planned_minutes / 60 * profile.effective_rate_mm_h
            # The adaptive ledger is in full-sun equivalent millimetres.  A
            # shaded reference zone intentionally receives less physical water,
            # so divide it back by its exposure factor before debiting the ledger.
            return round(physical_depth / profile.exposure_factor, 3)
        reference_minutes = max(1, zone.duration_minutes)
        reference_mm = max(
            0.1,
            float(self.store.settings.get("et_reference_mm", 5.0)),
        )
        return round(planned_minutes / reference_minutes * reference_mm, 3)

    @staticmethod
    def _adaptive_satisfaction_depths(
        target_mm: float | None,
        planned_physical_mm: float | None,
        moisture_action: str,
    ) -> tuple[float | None, float | None]:
        """Split planned satisfaction into immutable soil and physical shares."""
        if target_mm is None:
            return None, None
        physical = max(0.0, float(planned_physical_mm or 0.0))
        soil = (
            max(0.0, float(target_mm) - physical)
            if moisture_action in {"reduce", "skip"}
            else 0.0
        )
        return round(physical + soil, 3), round(soil, 3)

    @staticmethod
    def _completed_adaptive_depth(zones: list[dict[str, Any]]) -> float:
        """Return average delivered or soil-satisfied depth across program zones."""
        eligible = list(zones)
        if not eligible:
            return 0.0
        applied = 0.0
        for zone in eligible:
            outcome = zone.get("outcome")
            # Soil moisture already satisfies this share whether the later
            # hardware run completes, is skipped, or fails before the zone.
            applied += max(
                0.0,
                float(zone.get("adaptive_soil_satisfied_mm") or 0.0),
            )
            if outcome in {"completed", "skipped", "stopped"}:
                # Physical delivery is debited only after a confirmed stop.
                applied += max(
                    0.0,
                    float(zone.get("adaptive_applied_mm") or 0.0),
                )
        return round(applied / len(eligible), 3)

    @staticmethod
    def _planned_adaptive_depth(zones: list[dict[str, Any]]) -> float:
        """Return average delivered-or-soil-satisfied planned ledger depth."""
        eligible = list(zones)
        if not eligible:
            return 0.0
        applied = sum(
            max(0.0, float(zone.get("adaptive_satisfied_mm") or 0.0))
            for zone in eligible
        )
        return round(applied / len(eligible), 3)

    def _preview_account_balance(
        self,
        program: IrrigationProgram,
        state: AdaptiveBalance,
        accounting_date: date,
        decision: WeatherDecision,
        effective_rain_mm: float,
    ) -> tuple[AdaptiveBalance, float, bool]:
        """Apply one simulated daily delta without mutating persistent state."""
        updated, delta = account_daily_balance(
            state,
            accounting_date,
            self._decision_daily_etc(decision),
            effective_rain_mm / self._program_effective_exposure(program),
            float(
                self.store.settings.get(
                    "water_balance_max_rain_credit_mm",
                    15.0,
                )
            ),
        )
        return updated, delta, updated != state

    def _preview_effective_rain(
        self,
        decision: WeatherDecision,
        accounting_date: date,
        today: date,
    ) -> float:
        """Estimate cumulative deduplicated observed rain for preview."""
        raw = self.store.runtime.get("adaptive_rain_accounting") or {}
        accounting = dict(raw) if isinstance(raw, dict) else {}
        raw_days = accounting.get("days") or {}
        days = dict(raw_days) if isinstance(raw_days, dict) else {}
        day_key = accounting_date.isoformat()
        day_total = max(0.0, float(days.get(day_key, 0.0)))
        if accounting_date == today and decision.rain_station:
            observed = max(
                0.0,
                float(decision.observed_precipitation_mm or 0.0),
            )
            previous = accounting.get("last_measured_mm")
            same_station = str(accounting.get("station") or "") == str(
                decision.rain_station or ""
            )
            day_total += (
                observed
                if previous is None
                else 0.0
                if not same_station
                else max(0.0, observed - float(previous))
            )
        return round(day_total, 3)

    def _preview_adaptive_slot(
        self,
        program: IrrigationProgram,
        decision: WeatherDecision,
        target_mm: float,
        forecast: list[ForecastHour],
        window_start_at: datetime,
        window_end_at: datetime,
        planning_not_before: datetime,
        blocked_intervals: list[tuple[datetime, datetime]],
        *,
        candidate_targets: list[float] | None = None,
    ) -> tuple[float, list[dict[str, Any]], int | None, SmartSlotChoice]:
        """Find the largest 0.5 mm adaptive event that fully fits a window."""
        fallback_zones: list[dict[str, Any]] = []
        fallback_minutes: int | None = None
        fallback_choice: SmartSlotChoice | None = None
        for candidate_target in (
            candidate_targets
            if candidate_targets is not None
            else target_depth_candidates(target_mm)
        ):
            zones = [
                self._preview_zone(
                    zone,
                    decision,
                    program.weather_adjustment,
                    program.soil_moisture_enabled,
                    adaptive_target_mm=candidate_target,
                )
                for zone in program.zones
            ]
            durations = [
                int(zone["planned_minutes"])
                for zone in zones
                if zone["planned_minutes"] is not None
            ]
            total_minutes = (
                sum(durations) if len(durations) == len(zones) else None
            )
            if fallback_minutes is None:
                fallback_zones = zones
                fallback_minutes = total_minutes
            if total_minutes is None or total_minutes <= 0:
                continue
            choice = select_smart_watering_slot(
                forecast,
                window_start_at,
                window_end_at,
                total_minutes,
                self._program_head_types(program),
                self.store.settings,
                now=planning_not_before,
                blocked_intervals=blocked_intervals,
                transition_buffer_minutes=(
                    self._program_transition_buffer_minutes(program)
                ),
            )
            fallback_choice = choice
            fallback_zones = zones
            fallback_minutes = total_minutes
            if choice.status == "planned":
                return candidate_target, zones, total_minutes, choice
        if fallback_choice is None:
            fallback_choice = SmartSlotChoice(
                status="no_fit",
                reason=(
                    "Még 0,5 mm részöntözéshez sem számítható pozitív, "
                    "beférő zónaidő."
                ),
                window_start_at=window_start_at,
                window_end_at=window_end_at,
                duration_minutes=max(1, fallback_minutes or 1),
                transition_buffer_minutes=(
                    self._program_transition_buffer_minutes(program)
                ),
            )
        return target_mm, fallback_zones, fallback_minutes, fallback_choice

    def _persisted_preview_choice(
        self,
        item: dict[str, Any] | None,
        occurrence: ProgramOccurrence,
        now: datetime,
        duration_minutes: int,
    ) -> SmartSlotChoice | None:
        """Return a still-actionable durable smart plan without replanning it."""
        if (
            not item
            or occurrence.window_start_at is None
            or occurrence.window_end_at is None
            or duration_minutes <= 0
        ):
            return None
        scheduled_at = _parse_runtime_datetime(item.get("scheduled_at"), None)
        planned_end_at = _parse_runtime_datetime(item.get("planned_end_at"), None)
        stored_window_end = _parse_runtime_datetime(item.get("window_end_at"), None)
        if scheduled_at is None or planned_end_at is None:
            return None
        timezone = occurrence.window_start_at.tzinfo
        scheduled_at = scheduled_at.astimezone(timezone)
        planned_end_at = planned_end_at.astimezone(timezone)
        window_end_at = (
            stored_window_end.astimezone(timezone)
            if stored_window_end is not None
            else occurrence.window_end_at
        )
        if (
            scheduled_at < occurrence.window_start_at
            or scheduled_at >= window_end_at
            or planned_end_at <= scheduled_at
            or planned_end_at > window_end_at
            or now >= window_end_at
        ):
            return None
        if scheduled_at < now:
            shift = now - scheduled_at
            scheduled_at = now
            planned_end_at += shift
            if planned_end_at > window_end_at:
                return None
        return SmartSlotChoice(
            status="planned",
            reason=str(
                item.get("selection_reason")
                or "A korábban kiszámított intelligens kezdés tartósan lefoglalva."
            ),
            window_start_at=occurrence.window_start_at,
            window_end_at=window_end_at,
            duration_minutes=max(
                1,
                int(item.get("planned_minutes") or duration_minutes),
            ),
            transition_buffer_minutes=self._program_transition_buffer_minutes(
                occurrence.program
            ),
            scheduled_at=scheduled_at,
            planned_end_at=planned_end_at,
        )

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
        last_updated = getattr(state, "last_updated", None)
        if isinstance(last_updated, datetime):
            if last_updated.tzinfo is None:
                last_updated = last_updated.replace(tzinfo=UTC)
            age_seconds = (
                dt_util.utcnow().astimezone(UTC) - last_updated.astimezone(UTC)
            ).total_seconds()
            if age_seconds > SOIL_MOISTURE_MAX_AGE_SECONDS:
                return {
                    "moisture_sensor_entity_id": sensor_entity_id,
                    "moisture_sensor_name": sensor_name,
                    "moisture_percent": None,
                    "moisture_factor": 1.0,
                    "moisture_action": "unavailable",
                    "moisture_reason": (
                        "A talajnedvesség-adat 12 óránál régebbi; "
                        "az időtartam biztonságosan nem módosul."
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
        conflicts = self._smart_program_conflicts(program)
        if conflicts:
            other = conflicts[0]
            shared = sorted(
                {zone.entity_id for zone in program.zones}
                & {zone.entity_id for zone in other.zones}
            )
            raise ValueError(
                f"A(z) {program.name} és a(z) {other.name} engedélyezett "
                f"intelligens program közös zónát használ: {', '.join(shared)}. "
                "Egy zóna csak egy engedélyezett intelligens programhoz tartozhat."
            )
        previous: IrrigationProgram | None = None
        for index, current in enumerate(self.store.programs):
            if current.program_id == program.program_id:
                previous = current
                self.store.programs[index] = program
                break
        else:
            self.store.programs.append(program)
        self._remove_delayed_program_runs(program.program_id)
        if previous is not None and (
            previous.enabled != program.enabled
            or previous.schedule_mode != program.schedule_mode
            or {zone.entity_id for zone in previous.zones}
            != {zone.entity_id for zone in program.zones}
        ):
            self._remove_adaptive_program_balance(program.program_id)
        await self.store.async_save()
        self._notify_listeners()
        return program

    def _smart_program_conflicts(
        self,
        program: IrrigationProgram,
    ) -> list[IrrigationProgram]:
        """Return enabled smart programs that share any adaptive-ledger zone."""
        if not program.enabled or program.schedule_mode != "smart_window":
            return []
        zones = {zone.entity_id for zone in program.zones}
        return [
            other
            for other in self.store.programs
            if other.program_id != program.program_id
            and other.enabled
            and other.schedule_mode == "smart_window"
            and zones.intersection(zone.entity_id for zone in other.zones)
        ]

    def _smart_overlap_owner(self, program: IrrigationProgram) -> str:
        """Choose one deterministic owner for legacy conflicting smart programs."""
        conflicts = self._smart_program_conflicts(program)
        return min(
            (program.program_id, *(item.program_id for item in conflicts)),
        )

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
        self._remove_adaptive_program_balance(program_id)
        await self.store.async_save()
        self._notify_listeners()

    def _remove_delayed_program_runs(self, program_id: str) -> None:
        """Cancel future wind or smart starts when a program changes."""
        self.store.runtime["delayed_runs"] = [
            item
            for item in list(self.store.runtime.get("delayed_runs") or [])
            if str(item.get("program_id") or "") != program_id
        ]

    def _remove_adaptive_program_balance(self, program_id: str) -> None:
        """Discard a ledger whose schedule semantics or zone set no longer match."""
        raw = self.store.runtime.get("adaptive_balances") or {}
        if isinstance(raw, dict) and program_id in raw:
            balances = dict(raw)
            balances.pop(program_id, None)
            self.store.runtime["adaptive_balances"] = balances
        raw_keys = self.store.runtime.get("adaptive_deferred_keys") or {}
        if isinstance(raw_keys, dict) and program_id in raw_keys:
            deferred_keys = dict(raw_keys)
            deferred_keys.pop(program_id, None)
            self.store.runtime["adaptive_deferred_keys"] = deferred_keys

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
            "water_balance_min_mm": (0, 50),
            "water_balance_max_event_mm": (0.5, 50),
            "water_balance_max_rain_credit_mm": (0, 100),
            "water_balance_max_defer_windows": (0, 30),
            "water_balance_rain_lookahead_hours": (1, 168),
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
            candidate[key] = (
                int(number)
                if key
                in {
                    "rainy_hours_skip",
                    "water_balance_max_defer_windows",
                    "water_balance_rain_lookahead_hours",
                }
                else number
            )
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
                        "HomeAssistant SmartYardian/0.18.0 "
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
        adaptive_target_mm: float | None = None,
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
                if (
                    smart_automatic
                    and self._smart_overlap_owner(current_program)
                    != current_program.program_id
                ):
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        (
                            "Átfedő intelligens program ugyanazt a zónát használná; "
                            "a duplikált öntözést a rendszer biztonságosan kihagyta."
                        ),
                    )
                    return

            decision_at = evaluation_now if allow_wind_delay else scheduled_at
            decision = (
                await self.async_weather_decision(decision_at)
                if (
                    apply_weather
                    or uses_reference
                    or uses_temperature_condition
                    or smart_automatic
                )
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
            # Keep the calendar-day ledger decision separate from a possible
            # next-day slot decision for an overnight smart window.  Future ET
            # is booked only when that calendar day actually arrives.
            ledger_decision = decision
            ledger_date = decision_at.date()
            slot_not_before = evaluation_now
            current_day_blocks = (
                not program.temperature_condition_matches(decision.max_temperature)
                or (decision.factor == 0 and not smart_automatic)
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
            if decision.factor == 0 and not smart_automatic:
                await self._async_record_skip(program, scheduled_at, decision.reason, decision)
                return
            forecast: list[ForecastHour] | None = None
            adaptive_balance: AdaptiveBalance | None = None
            adaptive_daily_delta = 0.0
            future_rain_mm = 0.0
            if smart_automatic:
                previous_rebaseline = self._adaptive_balance(
                    program.program_id
                ).last_rebaseline_date
                effective_rain, rain_changed = self._adaptive_effective_rain(
                    ledger_decision,
                    ledger_date,
                )
                adaptive_balance, adaptive_daily_delta, balance_changed = (
                    self._account_adaptive_program(
                        program,
                        ledger_date,
                        ledger_decision,
                        effective_rain,
                    )
                )
                if rain_changed or balance_changed:
                    await self.store.async_save()
                if (
                    adaptive_balance.last_rebaseline_date is not None
                    and adaptive_balance.last_rebaseline_date != previous_rebaseline
                ):
                    await self._async_notify_adaptive_rebaseline_once(
                        program,
                        adaptive_balance,
                    )
                forecast = await self._async_idokep_forecast()
                future_rain_mm = self._future_rain_after_accounted_day(
                    forecast,
                    decision_at,
                )
                future_ledger_rain_mm = (
                    future_rain_mm / self._program_effective_exposure(program)
                )
                available_target = choose_irrigation_target(
                    adaptive_balance.balance_mm - future_ledger_rain_mm,
                    float(
                        self.store.settings.get(
                            "water_balance_max_event_mm",
                            10.0,
                        )
                    ),
                )
                defer, adaptive_reason = should_defer_watering(
                    adaptive_balance.balance_mm,
                    future_ledger_rain_mm,
                    adaptive_balance.deferred_windows,
                    float(
                        self.store.settings.get(
                            "water_balance_min_mm",
                            5.0,
                        )
                    ),
                    int(
                        self.store.settings.get(
                            "water_balance_max_defer_windows",
                            2,
                        )
                    ),
                )
                if defer:
                    adaptive_balance = self._defer_adaptive_once(
                        program,
                        adaptive_balance,
                        run_key,
                        original_scheduled_at,
                    )
                    await self.store.async_save()
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        adaptive_reason,
                        replace(
                            decision,
                            irrigation_target_mm=0.0,
                            reason=adaptive_reason,
                        ),
                    )
                    return
                if adaptive_target_mm is None:
                    adaptive_target_mm = available_target
                else:
                    adaptive_target_mm = min(
                        max(0.0, float(adaptive_target_mm)),
                        available_target,
                    )
                if adaptive_target_mm < 0.5:
                    adaptive_balance = self._defer_adaptive_once(
                        program,
                        adaptive_balance,
                        run_key,
                        original_scheduled_at,
                    )
                    await self.store.async_save()
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        "A vízmérlegben nincs legalább 0,5 mm kijuttatható vízhiány.",
                        decision,
                    )
                    return
                decision = replace(
                    decision,
                    irrigation_target_mm=round(adaptive_target_mm, 3),
                    reason=(
                        f"{decision.reason} A napi vízmérleg változása "
                        f"{adaptive_daily_delta:+g} mm, a következő napok "
                        f"várható esője {future_rain_mm:g} mm."
                    ),
                )

            zone_results = [
                self._zone_run_details(
                    zone,
                    decision,
                    program.soil_moisture_enabled,
                    adaptive_target_mm=(
                        adaptive_target_mm if smart_automatic else None
                    ),
                )
                for zone in program.zones
            ]
            if (
                program.soil_moisture_enabled
                and zone_results
                and all(result["moisture_action"] == "skip" for result in zone_results)
            ):
                if smart_automatic and adaptive_balance is not None:
                    soil_satisfied_mm = self._planned_adaptive_depth(zone_results)
                    adaptive_balance = settle_soil_satisfied_need(
                        adaptive_balance,
                        soil_satisfied_mm,
                    )
                    self._set_adaptive_balance(
                        program.program_id,
                        adaptive_balance,
                    )
                # The balance, terminal marker and skip history are committed
                # by the single Store save inside _async_record_skip.  A restart
                # cannot settle wet soil and then run the same durable claim.
                self._mark_terminal_run(run_key)
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
                assert forecast is not None
                assert adaptive_target_mm is not None
                choice: SmartSlotChoice | None = None
                for candidate_target in target_depth_candidates(adaptive_target_mm):
                    candidate_results = [
                        self._zone_run_details(
                            zone,
                            decision,
                            program.soil_moisture_enabled,
                            adaptive_target_mm=candidate_target,
                        )
                        for zone in program.zones
                    ]
                    candidate_minutes = sum(
                        int(result["planned_minutes"])
                        for result in candidate_results
                    )
                    if candidate_minutes <= 0:
                        continue
                    candidate_choice = select_smart_watering_slot(
                        forecast,
                        original_scheduled_at,
                        window_end_at,
                        candidate_minutes,
                        self._program_head_types(program),
                        self.store.settings,
                        now=slot_not_before,
                        blocked_intervals=self._smart_blocked_intervals(
                            run_key,
                            original_scheduled_at,
                            window_end_at,
                        ),
                        transition_buffer_minutes=(
                            self._program_transition_buffer_minutes(program)
                        ),
                    )
                    choice = candidate_choice
                    if candidate_choice.status == "planned":
                        adaptive_target_mm = candidate_target
                        zone_results = candidate_results
                        total_minutes = candidate_minutes
                        decision = replace(
                            decision,
                            irrigation_target_mm=round(candidate_target, 3),
                        )
                        break
                if choice is None:
                    await self._async_record_skip(
                        program,
                        scheduled_at,
                        (
                            "Még 0,5 mm részöntözéshez sem számítható "
                            "pozitív, beférő zónaidő."
                        ),
                        decision,
                        zones=zone_results,
                    )
                    return
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
                        adaptive_target_mm=adaptive_target_mm,
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
                adaptive_applied_mm=(
                    adaptive_target_mm if smart_automatic else None
                ),
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
        *,
        adaptive_target_mm: float | None = None,
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
                "adaptive_target_mm": adaptive_target_mm,
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
        adaptive_applied_mm: float | None = None,
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
            "adaptive_applied_mm": adaptive_applied_mm,
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
                zone_run_started = asyncio.get_running_loop().time()
                await self._async_start_zone(zone.entity_id, duration)
                self.active_run["zone_confirmed_started_at"] = dt_util.utcnow().isoformat()
                await self.store.async_save()
                wait_outcome = await self._async_wait_duration(duration)
                elapsed_seconds = max(
                    0.0,
                    asyncio.get_running_loop().time() - zone_run_started,
                )
                # Freeze elapsed delivery before requesting the valve stop.  If
                # stop confirmation fails, delivered water is still audited.
                self._apply_elapsed_zone_delivery(
                    result,
                    duration,
                    elapsed_seconds,
                    wait_outcome,
                )
                await self._async_stop_zone(zone.entity_id)
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
            applied_depth = (
                self._completed_adaptive_depth(zone_results)
                if adaptive_applied_mm is not None
                else 0.0
            )
            if applied_depth > 0:
                settled = settle_completed_irrigation(
                    self._adaptive_balance(program.program_id),
                    applied_depth,
                    completed,
                )
                self._set_adaptive_balance(program.program_id, settled)
                reason = (
                    f"{reason} A befejezett vagy részben lefutott zónák "
                    f"{applied_depth:g} mm kielégített vízigényét a vízmérleg "
                    "elszámolta."
                )
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
            self._mark_terminal_run(run_key)
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
        adaptive_target_mm: float | None = None,
    ) -> dict[str, Any]:
        """Build one planned zone result before program execution."""
        if adaptive_target_mm is not None and zone.duration_mode == "reference":
            profile = self.zone_profile(zone.entity_id)
            target_mm = max(0.0, float(adaptive_target_mm))
            duration = reference_duration_for_depth(profile, target_mm)
            base_minutes = duration
            calculation = {
                "duration_mode": "reference",
                "head_type": profile.head_type,
                "exposure": profile.exposure,
                "exposure_factor": profile.exposure_factor,
                "application_rate_mm_h": round(profile.effective_rate_mm_h, 2),
                "rate_source": profile.rate_source,
                "target_mm": round(target_mm, 2),
                "target_source": "többnapos vízmérleg",
                "rain_factor": 1.0,
            }
        elif adaptive_target_mm is not None:
            reference_mm = max(
                0.1,
                float(self.store.settings.get("et_reference_mm", 5.0)),
            )
            duration = max(
                1,
                min(
                    180,
                    round(zone.duration_minutes * adaptive_target_mm / reference_mm),
                ),
            )
            base_minutes = zone.duration_minutes
            calculation = {
                "duration_mode": "manual",
                "target_mm": round(adaptive_target_mm, 2),
                "target_source": "többnapos vízmérleg",
                "et_reference_mm": round(reference_mm, 2),
            }
        elif zone.duration_mode == "reference":
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
        adaptive_applied_mm = self._zone_adaptive_depth(
            zone,
            adaptive_target_mm,
            duration,
        )
        adaptive_satisfied_mm, adaptive_soil_satisfied_mm = (
            self._adaptive_satisfaction_depths(
                adaptive_target_mm,
                adaptive_applied_mm,
                str(moisture["moisture_action"]),
            )
        )
        state = self.hass.states.get(zone.entity_id)
        return {
            "entity_id": zone.entity_id,
            "name": state.name if state else zone.entity_id,
            "base_minutes": base_minutes,
            "pre_moisture_minutes": pre_moisture_minutes,
            "planned_minutes": duration,
            "adaptive_applied_mm": adaptive_applied_mm,
            "adaptive_satisfied_mm": adaptive_satisfied_mm,
            "adaptive_soil_satisfied_mm": adaptive_soil_satisfied_mm,
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
            confirmations = await asyncio.gather(
                *(
                    self._async_wait_state(
                        entity_id,
                        False,
                        STOP_CONFIRM_SECONDS,
                    )
                    for entity_id in sorted(active)
                )
            )
            unconfirmed = [
                entity_id
                for entity_id, confirmed in zip(
                    sorted(active),
                    confirmations,
                    strict=True,
                )
                if not confirmed
            ]
            self._notify_listeners()
            if unconfirmed:
                raise RuntimeError(
                    "A zóna nem igazolta vissza a leállást: "
                    + ", ".join(unconfirmed)
                )
        else:
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
