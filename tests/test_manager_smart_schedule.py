"""Focused manager regressions for fixed and intelligent scheduling."""

from __future__ import annotations

import ast
import asyncio
import copy
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from custom_components.smart_yardian.models import IrrigationProgram
from custom_components.smart_yardian.planning import (
    ProgramOccurrence,
    SmartSlotChoice,
    upcoming_occurrences,
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

        async def _async_run_claimed_delayed(self, *args: Any) -> None:
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
