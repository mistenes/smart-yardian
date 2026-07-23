"""Focused manager regressions for fixed and intelligent scheduling."""

from __future__ import annotations

import ast
import asyncio
import copy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from math import isfinite
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.smart_yardian.models import (
    ForecastHour,
    IrrigationProgram,
    WeatherDecision,
)
from custom_components.smart_yardian.planning import (
    ProgramOccurrence,
    SmartSlotChoice,
    upcoming_occurrences,
)
from custom_components.smart_yardian.weather import (
    WeatherUnavailableError,
    is_plausible_celsius,
    merge_hourly_forecast_cache,
)

PACKAGE_PATH = Path(__file__).parents[1] / "custom_components" / "smart_yardian"
MANAGER_PATH = PACKAGE_PATH / "manager.py"
WEBSOCKET_PATH = PACKAGE_PATH / "websocket.py"


def _definition(path: Path, name: str) -> ast.FunctionDef | ast.AsyncFunctionDef:
    module = ast.parse(path.read_text(encoding="utf-8"))
    return next(
        node
        for node in ast.walk(module)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name
    )


def _standalone_manager_method(name: str, namespace: dict[str, Any]) -> Any:
    """Compile one manager method without importing Home Assistant."""
    node = copy.deepcopy(_definition(MANAGER_PATH, name))
    node.decorator_list = []
    source = f"from __future__ import annotations\n{ast.unparse(node)}"
    scope = {"__name__": "manager_method_test", **namespace}
    exec(compile(source, str(MANAGER_PATH), "exec"), scope)
    return scope[name]


def _program(
    program_id: str,
    *,
    schedule_mode: str = "fixed",
    start_time: str = "05:30",
    window_start_time: str | None = None,
    window_end_time: str | None = None,
) -> IrrigationProgram:
    return IrrigationProgram.from_dict(
        {
            "program_id": program_id,
            "name": program_id,
            "enabled": True,
            "weekdays": [0],
            "schedule_mode": schedule_mode,
            "start_time": start_time,
            "window_start_time": window_start_time,
            "window_end_time": window_end_time,
            "zones": [{"entity_id": "switch.gyep", "duration_minutes": 20}],
        }
    )


def test_fixed_scheduler_still_requires_the_exact_configured_minute() -> None:
    due_occurrence = _standalone_manager_method(
        "_due_program_occurrence",
        {
            "IrrigationProgram": IrrigationProgram,
            "ProgramOccurrence": ProgramOccurrence,
            "timedelta": timedelta,
            "upcoming_occurrences": upcoming_occurrences,
        },
    )
    manager = SimpleNamespace()
    program = _program("fixed")

    assert due_occurrence(manager, program, datetime(2026, 7, 20, 5, 29, tzinfo=UTC)) is None
    occurrence = due_occurrence(
        manager,
        program,
        datetime(2026, 7, 20, 5, 30, tzinfo=UTC),
    )
    assert occurrence is not None
    assert occurrence.scheduled_at == datetime(2026, 7, 20, 5, 30, tzinfo=UTC)
    assert due_occurrence(manager, program, datetime(2026, 7, 20, 5, 31, tzinfo=UTC)) is None


def test_smart_run_key_stays_stable_when_selected_start_moves() -> None:
    run_key = _standalone_manager_method(
        "_program_run_key",
        {"ProgramOccurrence": ProgramOccurrence},
    )
    smart = _program(
        "smart",
        schedule_mode="smart_window",
        start_time="02:00",
        window_start_time="02:00",
        window_end_time="07:00",
    )
    opening = datetime(2026, 7, 20, 2, 0, tzinfo=UTC)
    service_date = opening.date()

    opening_key = run_key(
        ProgramOccurrence(smart, opening, service_date, opening, opening.replace(hour=7))
    )
    moved_key = run_key(
        ProgramOccurrence(
            smart,
            opening.replace(hour=4, minute=15),
            service_date,
            opening,
            opening.replace(hour=7),
        )
    )

    assert opening_key == moved_key == "smart:2026-07-20:smart_window"
    fixed = _program("fixed")
    assert run_key(ProgramOccurrence(fixed, opening, service_date)) == ("fixed:2026-07-20:05:30")


def test_smart_selected_start_replaces_same_key_and_persists_window() -> None:
    schedule = _standalone_manager_method(
        "_async_schedule_smart_start",
        {
            "IrrigationProgram": IrrigationProgram,
            "SmartSlotChoice": SmartSlotChoice,
            "datetime": datetime,
            "dt_util": SimpleNamespace(utcnow=lambda: datetime(2026, 7, 19, 18, 0, tzinfo=UTC)),
        },
    )

    class Store:
        def __init__(self) -> None:
            self.runtime = {
                "delayed_runs": [
                    {
                        "run_key": "smart:2026-07-20:smart_window",
                        "program_id": "smart",
                        "scheduled_at": "2026-07-20T03:00:00+00:00",
                    },
                    {
                        "run_key": "other:2026-07-20:06:00",
                        "program_id": "other",
                        "scheduled_at": "2026-07-20T06:00:00+00:00",
                    },
                ]
            }
            self.save_count = 0

        async def async_save(self) -> None:
            self.save_count += 1

    store = Store()
    manager = SimpleNamespace(
        store=store,
        _notify_listeners=lambda: None,
    )
    program = _program(
        "smart",
        schedule_mode="smart_window",
        start_time="02:00",
        window_start_time="02:00",
        window_end_time="07:00",
    )
    window_start = datetime(2026, 7, 20, 2, 0, tzinfo=UTC)
    selected = window_start.replace(hour=4, minute=15)
    window_end = window_start.replace(hour=7)
    choice = SmartSlotChoice(
        status="planned",
        reason="A legkedvezőbb száraz, szélcsendes időpont.",
        window_start_at=window_start,
        window_end_at=window_end,
        duration_minutes=40,
        scheduled_at=selected,
        planned_end_at=selected + timedelta(minutes=40),
    )

    asyncio.run(
        schedule(
            manager,
            program,
            window_start,
            window_start,
            choice,
            "smart:2026-07-20:smart_window",
        )
    )

    smart_entries = [
        item
        for item in store.runtime["delayed_runs"]
        if item["run_key"] == "smart:2026-07-20:smart_window"
    ]
    assert len(smart_entries) == 1
    assert smart_entries[0]["scheduled_at"] == selected.isoformat()
    assert smart_entries[0]["planned_end_at"] == (selected + timedelta(minutes=40)).isoformat()
    assert smart_entries[0]["window_end_at"] == window_end.isoformat()
    assert smart_entries[0]["planning_status"] == "smart_planned"
    assert store.save_count == 1
    assert len(store.runtime["delayed_runs"]) == 2


def test_due_overnight_smart_start_is_claimed_and_uses_actual_tick_time() -> None:
    parse_runtime_datetime = _standalone_manager_method(
        "_parse_runtime_datetime",
        {"Any": Any, "datetime": datetime},
    )
    run_due_delayed = _standalone_manager_method(
        "_async_run_due_delayed",
        {
            "Any": Any,
            "DOMAIN": "smart_yardian",
            "datetime": datetime,
            "dt_util": SimpleNamespace(utcnow=lambda: datetime(2026, 7, 21, 0, 0, tzinfo=UTC)),
            "uuid4": lambda: "claim-overnight",
            "_parse_runtime_datetime": parse_runtime_datetime,
        },
    )
    program = _program(
        "smart",
        schedule_mode="smart_window",
        start_time="22:00",
        window_start_time="22:00",
        window_end_time="05:00",
    )
    selected = datetime(2026, 7, 20, 23, 30, tzinfo=UTC)
    opening = datetime(2026, 7, 20, 22, 0, tzinfo=UTC)
    closing = datetime(2026, 7, 21, 5, 0, tzinfo=UTC)
    local_now = datetime(2026, 7, 21, 2, 0, tzinfo=UTC)

    class Store:
        def __init__(self) -> None:
            self.runtime = {
                "delayed_runs": [
                    {
                        "kind": "smart_window",
                        "run_key": "smart:2026-07-20:smart_window",
                        "program_id": "smart",
                        "original_scheduled_at": opening.isoformat(),
                        "scheduled_at": selected.isoformat(),
                        "window_end_at": closing.isoformat(),
                    }
                ]
            }
            self.save_count = 0

        async def async_save(self) -> None:
            self.save_count += 1

    class RestartedManager:
        def __init__(self) -> None:
            self.store = Store()
            self.tasks: list[asyncio.Task[None]] = []
            self.wrapper_calls: list[tuple[Any, ...]] = []
            self.skip_calls: list[tuple[Any, ...]] = []
            self.notify_count = 0

        def get_program(self, program_id: str) -> IrrigationProgram:
            assert program_id == "smart"
            return program

        async def _async_record_skip(self, *args: Any, **_kwargs: Any) -> None:
            self.skip_calls.append(args)

        async def _async_run_claimed_delayed(
            self,
            *args: Any,
            **_kwargs: Any,
        ) -> None:
            self.wrapper_calls.append(args)

        def _create_task(self, coro: Any, _name: str) -> None:
            self.tasks.append(asyncio.create_task(coro))

        def _notify_listeners(self) -> None:
            self.notify_count += 1

    manager = RestartedManager()

    async def scenario() -> None:
        executed: list[str] = []
        await run_due_delayed(manager, local_now, executed)
        claimed = manager.store.runtime["delayed_runs"]
        assert len(claimed) == 1
        assert claimed[0]["claim_id"] == "claim-overnight"
        assert claimed[0]["claimed_at"] == "2026-07-21T00:00:00+00:00"
        await asyncio.gather(*manager.tasks)
        assert executed == ["smart:2026-07-20:smart_window"]

    asyncio.run(scenario())

    assert manager.skip_calls == []
    assert len(manager.wrapper_calls) == 1
    wrapper_args = manager.wrapper_calls[0]
    assert wrapper_args[1] == local_now
    assert wrapper_args[2] == "smart:2026-07-20:smart_window"
    assert wrapper_args[3] == "claim-overnight"
    assert wrapper_args[4] == opening
    assert wrapper_args[5] == closing
    assert len(manager.store.runtime["delayed_runs"]) == 1
    assert manager.store.save_count == 1
    assert manager.notify_count == 1


def test_expired_smart_window_is_skipped_instead_of_claimed() -> None:
    parse_runtime_datetime = _standalone_manager_method(
        "_parse_runtime_datetime",
        {"Any": Any, "datetime": datetime},
    )
    run_due_delayed = _standalone_manager_method(
        "_async_run_due_delayed",
        {
            "Any": Any,
            "DOMAIN": "smart_yardian",
            "datetime": datetime,
            "dt_util": SimpleNamespace(utcnow=lambda: datetime.now(UTC)),
            "uuid4": lambda: "must-not-be-claimed",
            "_parse_runtime_datetime": parse_runtime_datetime,
        },
    )
    program = _program(
        "smart",
        schedule_mode="smart_window",
        start_time="22:00",
        window_start_time="22:00",
        window_end_time="05:00",
    )
    opening = datetime(2026, 7, 20, 22, 0, tzinfo=UTC)
    selected = datetime(2026, 7, 20, 23, 30, tzinfo=UTC)
    closing = datetime(2026, 7, 21, 5, 0, tzinfo=UTC)

    class Store:
        def __init__(self) -> None:
            self.runtime = {
                "delayed_runs": [
                    {
                        "kind": "smart_window",
                        "run_key": "smart:2026-07-20:smart_window",
                        "program_id": "smart",
                        "original_scheduled_at": opening.isoformat(),
                        "scheduled_at": selected.isoformat(),
                        "window_end_at": closing.isoformat(),
                    }
                ]
            }
            self.save_count = 0

        async def async_save(self) -> None:
            self.save_count += 1

    class Manager:
        def __init__(self) -> None:
            self.store = Store()
            self.skip_calls: list[tuple[Any, ...]] = []
            self.notify_count = 0

        def get_program(self, _program_id: str) -> IrrigationProgram:
            return program

        async def _async_record_skip(self, *args: Any, **_kwargs: Any) -> None:
            self.skip_calls.append(args)

        def _create_task(self, _coro: Any, _name: str) -> None:
            raise AssertionError("Lejárt időablakhoz nem készülhet futási task.")

        def _notify_listeners(self) -> None:
            self.notify_count += 1

    manager = Manager()
    asyncio.run(
        run_due_delayed(
            manager,
            closing,
            [],
        )
    )

    assert manager.store.runtime["delayed_runs"] == []
    assert len(manager.skip_calls) == 1
    assert "időablak bezárult" in manager.skip_calls[0][2]
    assert manager.store.save_count == 1
    assert manager.notify_count == 1


def test_claim_wrapper_runs_now_and_removes_only_its_exact_claim() -> None:
    finish_claim = _standalone_manager_method(
        "_async_finish_delayed_claim",
        {"Any": Any},
    )
    run_claimed = _standalone_manager_method(
        "_async_run_claimed_delayed",
        {
            "IrrigationProgram": IrrigationProgram,
            "asyncio": asyncio,
            "datetime": datetime,
            "_LOGGER": SimpleNamespace(exception=lambda *_args: None),
        },
    )
    program = _program(
        "smart",
        schedule_mode="smart_window",
        start_time="22:00",
        window_start_time="22:00",
        window_end_time="05:00",
    )
    local_now = datetime(2026, 7, 21, 2, 0, tzinfo=UTC)
    opening = datetime(2026, 7, 20, 22, 0, tzinfo=UTC)
    closing = datetime(2026, 7, 21, 5, 0, tzinfo=UTC)
    run_key = "smart:2026-07-20:smart_window"

    class Store:
        def __init__(self) -> None:
            self.runtime = {
                "delayed_runs": [
                    {"run_key": run_key, "claim_id": "claim-current"},
                    {"run_key": run_key, "claim_id": "claim-newer"},
                    {"run_key": run_key, "scheduled_at": "replanned"},
                    {"run_key": "other", "claim_id": "claim-current"},
                ]
            }
            self.save_count = 0

        async def async_save(self) -> None:
            self.save_count += 1

    class Manager:
        def __init__(self) -> None:
            self.store = Store()
            self.run_calls: list[tuple[datetime, dict[str, Any]]] = []
            self.notify_count = 0

        async def async_run_program(
            self,
            _program: IrrigationProgram,
            evaluated_at: datetime,
            **kwargs: Any,
        ) -> None:
            self.run_calls.append((evaluated_at, kwargs))

        async def _async_finish_delayed_claim(
            self,
            key: str,
            claim_id: str,
            *,
            remove: bool,
        ) -> None:
            await finish_claim(self, key, claim_id, remove=remove)

        def _notify_listeners(self) -> None:
            self.notify_count += 1

    manager = Manager()
    asyncio.run(
        run_claimed(
            manager,
            program,
            local_now,
            run_key,
            "claim-current",
            opening,
            closing,
        )
    )

    assert manager.run_calls == [
        (
            local_now,
            {
                "allow_wind_delay": True,
                "run_key": run_key,
                "original_scheduled_at": opening,
                "window_end_at": closing,
            },
        )
    ]
    remaining = manager.store.runtime["delayed_runs"]
    assert {item.get("claim_id") for item in remaining} == {
        "claim-newer",
        "claim-current",
        None,
    }
    assert all(
        not (item.get("run_key") == run_key and item.get("claim_id") == "claim-current")
        for item in remaining
    )
    assert manager.store.save_count == 1
    assert manager.notify_count == 1


def test_setup_recovers_stale_claims_but_discards_interrupted_claim() -> None:
    recover_claims = _standalone_manager_method(
        "_recover_delayed_claims",
        {"Any": Any},
    )
    store = SimpleNamespace(
        runtime={
            "delayed_runs": [
                {
                    "run_key": "active-key",
                    "program_id": "active-program",
                    "claim_id": "active-claim",
                    "claimed_at": "2026-07-20T22:00:00+00:00",
                },
                {
                    "run_key": "retry-key",
                    "program_id": "retry-program",
                    "claim_id": "stale-claim",
                    "claimed_at": "2026-07-20T22:00:00+00:00",
                },
                {"run_key": "unclaimed-key", "program_id": "unclaimed"},
            ],
            "active_run": {
                "run_key": "active-key",
                "program_id": "active-program",
            },
        }
    )
    manager = SimpleNamespace(store=store)

    assert recover_claims(manager, store.runtime["active_run"]) is True
    assert [item["run_key"] for item in store.runtime["delayed_runs"]] == [
        "retry-key",
        "unclaimed-key",
    ]
    assert "claim_id" not in store.runtime["delayed_runs"][0]
    assert "claimed_at" not in store.runtime["delayed_runs"][0]
    assert recover_claims(manager, store.runtime["active_run"]) is False

    setup_source = ast.unparse(_definition(MANAGER_PATH, "async_setup"))
    assert "recovered_claims = self._recover_delayed_claims" in setup_source
    assert "or recovered_claims" in setup_source


def test_restart_hydrates_the_persisted_forecast_needed_by_the_open_window() -> None:
    """A HA restart at 02:45 must not discard the cached 02:00-05:00 cards."""
    now = datetime(2026, 7, 23, 2, 45, tzinfo=UTC)
    fetched_at = datetime(2026, 7, 23, 2, 30, tzinfo=UTC)
    parse_runtime_datetime = _standalone_manager_method(
        "_parse_runtime_datetime",
        {"Any": Any, "datetime": datetime},
    )
    hour_from_runtime = _standalone_manager_method(
        "_forecast_hour_from_runtime",
        {
            "Any": Any,
            "ForecastHour": ForecastHour,
            "UTC": UTC,
            "_parse_runtime_datetime": parse_runtime_datetime,
            "isfinite": isfinite,
            "is_plausible_celsius": is_plausible_celsius,
        },
    )
    hour_to_runtime = _standalone_manager_method(
        "_forecast_hour_to_runtime",
        {"ForecastHour": ForecastHour, "UTC": UTC},
    )
    serialize_cache = _standalone_manager_method(
        "_serialized_idokep_forecast_cache",
        {
            "Any": Any,
            "UTC": UTC,
            "IDOKEP_FORECAST_CACHE_MAX_HOURS": 120,
            "IDOKEP_FORECAST_CACHE_VERSION": 2,
        },
    )
    hydrate_cache = _standalone_manager_method(
        "_hydrate_idokep_forecast_cache",
        {
            "Any": Any,
            "ForecastHour": ForecastHour,
            "UTC": UTC,
            "IDOKEP_FORECAST_CACHE_RUNTIME_KEY": "idokep_forecast_cache",
            "IDOKEP_FORECAST_CACHE_VERSION": 2,
            "IDOKEP_FORECAST_CACHE_MAX_HOURS": 120,
            "_parse_runtime_datetime": parse_runtime_datetime,
            "dt_util": SimpleNamespace(utcnow=lambda: now),
            "merge_hourly_forecast_cache": merge_hourly_forecast_cache,
        },
    )
    clear_cache = _standalone_manager_method(
        "_clear_idokep_forecast_cache",
        {"IDOKEP_FORECAST_CACHE_RUNTIME_KEY": "idokep_forecast_cache"},
    )
    hours = [
        ForecastHour(
            timestamp=datetime(2026, 7, 23, hour, 0, tzinfo=UTC),
            temperature=18,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="clear-night",
            wind_speed_kmh=10,
            wind_gust_kmh=15,
            humidity_percent=75,
        )
        for hour in range(2, 6)
    ]
    raw_cache = {
        "version": 2,
        "source": {
            "weather_entity": "weather.idokep",
            "location": "budapest",
        },
        "fetched_at": fetched_at.isoformat(),
        "hours": [hour_to_runtime(hour, fetched_at) for hour in hours],
    }

    class RestartedManager:
        _forecast_hour_from_runtime = staticmethod(hour_from_runtime)
        _forecast_hour_to_runtime = staticmethod(hour_to_runtime)
        _serialized_idokep_forecast_cache = serialize_cache
        _hydrate_idokep_forecast_cache = hydrate_cache
        _clear_idokep_forecast_cache = clear_cache

        def _idokep_forecast_source_identity(self) -> dict[str, str]:
            return {
                "weather_entity": "weather.idokep",
                "location": "budapest",
            }

        def __init__(self) -> None:
            self.store = SimpleNamespace(
                runtime={"idokep_forecast_cache": copy.deepcopy(raw_cache)}
            )
            self._idokep_forecast_snapshot: list[ForecastHour] = []
            self._idokep_forecast_last_seen: dict[datetime, datetime] = {}
            self._idokep_forecast_refreshed_at: datetime | None = None
            self._idokep_forecast_cache_saved_at: datetime | None = None

    manager = RestartedManager()

    changed = manager._hydrate_idokep_forecast_cache()

    assert changed is False
    assert manager._idokep_forecast_snapshot == hours
    assert set(manager._idokep_forecast_last_seen) == {
        hour.timestamp for hour in hours
    }
    assert manager._idokep_forecast_refreshed_at == fetched_at
    assert manager._idokep_forecast_cache_saved_at == fetched_at
    assert manager.store.runtime["idokep_forecast_cache"] == raw_cache

    wrong_location = RestartedManager()
    wrong_location.store.runtime["idokep_forecast_cache"]["source"]["location"] = (
        "szeged"
    )

    assert wrong_location._hydrate_idokep_forecast_cache() is True
    assert wrong_location._idokep_forecast_snapshot == []
    assert "idokep_forecast_cache" not in wrong_location.store.runtime


def test_weather_history_uses_the_actual_decision_time_not_first_forecast_hour() -> None:
    """The history timestamp must describe the decision, not the day anchor."""
    scheduled_at = datetime(2026, 7, 23, 2, 45, tzinfo=UTC)
    first_forecast_hour = datetime(2026, 7, 23, 6, 0, tzinfo=UTC)
    decided_at = datetime(2026, 7, 23, 2, 45, 12, tzinfo=UTC)
    calculated = WeatherDecision(
        factor=0.82,
        source="Időkép",
        precipitation_mm=0,
        max_probability=30,
        max_temperature=24,
        sunny_hours=0,
        rainy_hours=3,
        reason="Teszt.",
        evaluated_at=first_forecast_hour,
    )

    async_weather_decision = _standalone_manager_method(
        "async_weather_decision",
        {
            "WeatherDecision": WeatherDecision,
            "WeatherUnavailableError": WeatherUnavailableError,
            "evaluate_calendar_day": lambda *_args, **_kwargs: calculated,
            "replace": replace,
            "dt_util": SimpleNamespace(utcnow=lambda: decided_at),
        },
    )

    class Manager:
        def __init__(self) -> None:
            self.store = SimpleNamespace(settings={})
            self.hass = SimpleNamespace(config=SimpleNamespace(latitude=47.5))
            self.last_decision = None
            self.last_error = None

        async def _async_idokep_forecast(self) -> list[ForecastHour]:
            return []

        async def _async_selected_rain_observation(self) -> None:
            return None

        def _notify_listeners(self) -> None:
            return None

    Manager.async_weather_decision = async_weather_decision
    result = asyncio.run(Manager().async_weather_decision(scheduled_at))

    assert result.evaluated_at == decided_at
    assert result.evaluated_at != first_forecast_hour


def test_forecast_cache_flush_is_throttled_but_runtime_stays_current() -> None:
    """Frequent readers update memory without writing the Store every time."""
    persist_cache = _standalone_manager_method(
        "_async_persist_idokep_forecast_cache",
        {
            "datetime": datetime,
            "IDOKEP_FORECAST_CACHE_RUNTIME_KEY": "idokep_forecast_cache",
            "IDOKEP_FORECAST_PRIME_SECONDS": 15 * 60,
        },
    )

    class Store:
        def __init__(self) -> None:
            self.runtime: dict[str, Any] = {}
            self.save_count = 0

        async def async_save(self) -> None:
            self.save_count += 1

    class Manager:
        _async_persist_idokep_forecast_cache = persist_cache

        def __init__(self) -> None:
            self.store = Store()
            self._idokep_forecast_cache_saved_at: datetime | None = None

        def _serialized_idokep_forecast_cache(
            self,
            fetched_at: datetime,
        ) -> dict[str, str]:
            return {"fetched_at": fetched_at.isoformat()}

    manager = Manager()
    first = datetime(2026, 7, 23, 2, 0, tzinfo=UTC)

    asyncio.run(manager._async_persist_idokep_forecast_cache(first))
    asyncio.run(
        manager._async_persist_idokep_forecast_cache(first + timedelta(minutes=5))
    )

    assert manager.store.save_count == 1
    assert manager.store.runtime["idokep_forecast_cache"]["fetched_at"] == (
        first + timedelta(minutes=5)
    ).isoformat()

    asyncio.run(
        manager._async_persist_idokep_forecast_cache(first + timedelta(minutes=15))
    )
    assert manager.store.save_count == 2


def test_restart_accounts_elapsed_current_zone_without_losing_soil_credit() -> None:
    """A persisted running zone is settled up to the restart stop instant."""
    parse_runtime_datetime = _standalone_manager_method(
        "_parse_runtime_datetime",
        {"Any": Any, "datetime": datetime},
    )
    apply_elapsed = _standalone_manager_method(
        "_apply_elapsed_zone_delivery",
        {"Any": Any},
    )
    finalize = _standalone_manager_method(
        "_finalize_interrupted_zone_progress",
        {
            "Any": Any,
            "UTC": UTC,
            "datetime": datetime,
            "_parse_runtime_datetime": parse_runtime_datetime,
        },
    )
    stopped_at = datetime(2026, 7, 20, 5, 5, tzinfo=UTC)
    interrupted = {
        "current_index": 0,
        "current_zone": "switch.gyep",
        "current_duration": 10,
        "zone_confirmed_started_at": "2026-07-20T05:00:00+00:00",
        "zones": [
            {
                "entity_id": "switch.gyep",
                "planned_minutes": 10,
                "adaptive_applied_mm": 4.0,
                "adaptive_soil_satisfied_mm": 2.0,
                "outcome": "running",
            }
        ],
    }
    manager = SimpleNamespace(_apply_elapsed_zone_delivery=apply_elapsed)

    finalize(manager, interrupted, stopped_at)

    zone = interrupted["zones"][0]
    assert zone["outcome"] == "stopped"
    assert zone["actual_duration_seconds"] == 300.0
    assert zone["adaptive_applied_mm"] == 2.0
    assert zone["adaptive_soil_satisfied_mm"] == 2.0
    assert "_finalize_interrupted_zone_progress" in ast.unparse(
        _definition(MANAGER_PATH, "async_setup")
    )


def test_stop_all_requires_off_confirmation_for_every_active_zone() -> None:
    stop_all = _standalone_manager_method(
        "async_stop_all",
        {
            "ATTR_ENTITY_ID": "entity_id",
            "STATE_ON": "on",
            "STOP_CONFIRM_SECONDS": 20,
            "asyncio": asyncio,
        },
    )

    class Services:
        def __init__(self) -> None:
            self.calls: list[dict[str, Any]] = []

        async def async_call(
            self,
            _domain: str,
            _service: str,
            _data: dict[str, Any],
            *,
            target: dict[str, Any],
            blocking: bool,
        ) -> None:
            assert blocking is True
            self.calls.append(target)

    class Manager:
        def __init__(self) -> None:
            self._stop_event = SimpleNamespace(set=lambda: None)
            self.zone_entities = ["switch.a", "switch.b"]
            self.hass = SimpleNamespace(
                states=SimpleNamespace(
                    get=lambda entity_id: SimpleNamespace(
                        state="on" if entity_id in self.zone_entities else "off"
                    )
                ),
                services=Services(),
            )
            self.active_run = None
            self.confirmed: list[str] = []
            self.notified = 0

        async def _async_wait_state(
            self,
            entity_id: str,
            _expected_on: bool,
            _timeout: int,
        ) -> bool:
            self.confirmed.append(entity_id)
            return entity_id != "switch.b"

        def _notify_listeners(self) -> None:
            self.notified += 1

    manager = Manager()

    with pytest.raises(RuntimeError, match="switch.b"):
        asyncio.run(stop_all(manager))

    assert manager.hass.services.calls == [
        {"entity_id": ["switch.a", "switch.b"]}
    ]
    assert manager.confirmed == ["switch.a", "switch.b"]
    assert manager.notified == 1


def test_reenabling_smart_program_resets_disabled_period_ledger() -> None:
    save_program = _standalone_manager_method(
        "async_save_program",
        {"Any": Any, "IrrigationProgram": IrrigationProgram},
    )
    disabled = _program(
        "smart",
        schedule_mode="smart_window",
        start_time="02:00",
        window_start_time="02:00",
        window_end_time="07:00",
    )
    disabled.enabled = False

    class Store:
        def __init__(self) -> None:
            self.programs = [disabled]
            self.runtime = {"adaptive_balances": {"smart": {"balance_mm": 40.0}}}

        async def async_save(self) -> None:
            return None

    removed: list[str] = []
    store = Store()
    manager = SimpleNamespace(
        store=store,
        zone_entities=["switch.gyep"],
        _smart_program_conflicts=lambda _program: [],
        _remove_delayed_program_runs=lambda _program_id: None,
        _remove_adaptive_program_balance=lambda program_id: removed.append(program_id),
        _notify_listeners=lambda: None,
    )
    enabled_raw = disabled.as_dict()
    enabled_raw["enabled"] = True

    saved = asyncio.run(save_program(manager, enabled_raw))

    assert saved.enabled is True
    assert removed == ["smart"]
    account_source = ast.unparse(
        _definition(MANAGER_PATH, "_async_account_adaptive_balances")
    )
    assert "program.enabled" in account_source


def test_initial_smart_claim_is_saved_before_background_task_creation() -> None:
    minute_tick = ast.unparse(_definition(MANAGER_PATH, "_async_minute_tick"))
    claim_at = minute_tick.index("claim_id = self._claim_smart_occurrence")
    save_at = minute_tick.index("await self.store.async_save()", claim_at)
    task_at = minute_tick.index("self._create_task", save_at)
    wrapper_at = minute_tick.index("self._async_run_claimed_delayed", task_at)

    assert claim_at < save_at < task_at < wrapper_at


def test_preview_exposes_explainable_smart_plan_payload() -> None:
    preview_source = ast.unparse(_definition(MANAGER_PATH, "async_three_day_preview"))

    assert "select_smart_watering_slot" in preview_source
    for field in (
        "schedule_mode",
        "window_start_at",
        "window_end_at",
        "planned_end_at",
        "planning_status",
        "selection_reason",
    ):
        assert f"'{field}'" in preview_source or f'"{field}"' in preview_source


def test_manual_runs_never_implicitly_enable_smart_window_delay() -> None:
    run_program = _definition(MANAGER_PATH, "async_run_program")
    keyword_defaults = dict(
        zip(
            (argument.arg for argument in run_program.args.kwonlyargs),
            run_program.args.kw_defaults,
            strict=True,
        )
    )
    allow_wind_delay = keyword_defaults["allow_wind_delay"]
    assert isinstance(allow_wind_delay, ast.Constant)
    assert allow_wind_delay.value is False

    manual_zone = _definition(MANAGER_PATH, "async_run_manual_zone")
    manager_call = next(
        node
        for node in ast.walk(manual_zone)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "async_run_program"
    )
    manager_keywords = {item.arg: item.value for item in manager_call.keywords}
    assert isinstance(manager_keywords["apply_weather"], ast.Constant)
    assert manager_keywords["apply_weather"].value is False
    assert "allow_wind_delay" not in manager_keywords

    for websocket_handler in ("websocket_run_program", "websocket_run_manual_program"):
        handler = _definition(WEBSOCKET_PATH, websocket_handler)
        websocket_call = next(
            node
            for node in ast.walk(handler)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "async_run_program"
        )
        assert all(keyword.arg != "allow_wind_delay" for keyword in websocket_call.keywords)
