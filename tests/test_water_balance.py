"""Tests for multi-day adaptive irrigation water balance helpers."""

from __future__ import annotations

import ast
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import pytest

from custom_components.smart_yardian.evapotranspiration import (
    estimate_daily_evapotranspiration,
)
from custom_components.smart_yardian.models import ForecastHour, IrrigationProgram
from custom_components.smart_yardian.soil_moisture import assess_soil_moisture
from custom_components.smart_yardian.water_balance import (
    AdaptiveBalance,
    account_daily_balance,
    choose_irrigation_target,
    defer_window,
    forecast_rain_in_horizon,
    settle_completed_irrigation,
    should_defer_watering,
    target_depth_candidates,
)
from custom_components.smart_yardian.weather import normalize_ha_forecast

MANAGER_PATH = (
    Path(__file__).parents[1]
    / "custom_components"
    / "smart_yardian"
    / "manager.py"
)


def _forecast_hour(
    timestamp: datetime,
    *,
    precipitation_mm: float = 0.0,
) -> ForecastHour:
    return ForecastHour(
        timestamp=timestamp,
        temperature=24.0,
        precipitation_mm=precipitation_mm,
        precipitation_probability=0.0,
        condition="sunny",
        cloud_cover=20.0,
        is_daylight=True,
        wind_speed_kmh=8.0,
    )


def _function_source(name: str) -> str:
    return ast.unparse(_function_node(name))


def _standalone_manager_function(name: str):
    """Compile one dependency-free manager helper without importing HA."""
    node = _function_node(name)
    node.decorator_list = []
    scope: dict[str, object] = {}
    exec(
        compile(
            f"from __future__ import annotations\n{ast.unparse(node)}",
            str(MANAGER_PATH),
            "exec",
        ),
        scope,
    )
    return scope[name]


def _function_node(name: str) -> ast.FunctionDef | ast.AsyncFunctionDef:
    module = ast.parse(MANAGER_PATH.read_text(encoding="utf-8"))
    return next(
        item
        for item in ast.walk(module)
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
        and item.name == name
    )


def test_adaptive_balance_roundtrip_preserves_persistent_state() -> None:
    state = AdaptiveBalance.from_dict(
        {
            "balance_mm": 6.25,
            "last_accounted_date": "2026-07-20",
            "deferred_windows": 2,
            "last_irrigation_at": "2026-07-20T04:15:00+00:00",
            "last_applied_mm": 3.5,
        }
    )

    assert state.balance_mm == pytest.approx(6.25)
    assert state.last_accounted_date == date(2026, 7, 20)
    assert state.deferred_windows == 2
    assert state.last_irrigation_at == datetime(2026, 7, 20, 4, 15, tzinfo=UTC)
    assert state.last_applied_mm == pytest.approx(3.5)
    assert AdaptiveBalance.from_dict(state.as_dict()) == state


def test_daily_water_need_is_accounted_exactly_once_per_date() -> None:
    state = AdaptiveBalance()
    accounting_day = date(2026, 7, 20)

    state, delta = account_daily_balance(
        state,
        accounting_day,
        etc_mm=3.0,
        effective_rain_mm=0.0,
        max_rain_credit_mm=10.0,
    )
    repeated, repeated_delta = account_daily_balance(
        state,
        accounting_day,
        etc_mm=9.0,
        effective_rain_mm=0.0,
        max_rain_credit_mm=10.0,
    )

    assert delta == pytest.approx(3.0)
    assert state.balance_mm == pytest.approx(3.0)
    assert repeated == state
    assert repeated_delta == pytest.approx(0.0)


def test_two_dry_days_cross_minimum_only_at_second_window() -> None:
    state = AdaptiveBalance()
    state, _ = account_daily_balance(
        state,
        date(2026, 7, 20),
        etc_mm=3.0,
        effective_rain_mm=0.0,
        max_rain_credit_mm=10.0,
    )
    defer_first, first_reason = should_defer_watering(
        state.balance_mm,
        forecast_rain_mm=0.0,
        deferred_windows=0,
        min_balance_mm=5.0,
        max_defer_windows=2,
    )

    state, _ = account_daily_balance(
        state,
        date(2026, 7, 21),
        etc_mm=3.0,
        effective_rain_mm=0.0,
        max_rain_credit_mm=10.0,
    )
    defer_second, _ = should_defer_watering(
        state.balance_mm,
        forecast_rain_mm=0.0,
        deferred_windows=0,
        min_balance_mm=5.0,
        max_defer_windows=2,
    )

    assert defer_first is True
    assert "5" in first_reason
    assert state.balance_mm == pytest.approx(6.0)
    assert defer_second is False
    assert choose_irrigation_target(state.balance_mm, max_event_mm=8.0) == pytest.approx(6.0)


def test_heavy_rain_credit_carries_forward_but_is_limited() -> None:
    state, delta = account_daily_balance(
        AdaptiveBalance(),
        date(2026, 7, 20),
        etc_mm=2.0,
        effective_rain_mm=30.0,
        max_rain_credit_mm=8.0,
    )

    assert state.balance_mm == pytest.approx(-8.0)
    assert delta == pytest.approx(-8.0)

    next_day, _ = account_daily_balance(
        state,
        date(2026, 7, 21),
        etc_mm=3.0,
        effective_rain_mm=0.0,
        max_rain_credit_mm=8.0,
    )

    assert next_day.balance_mm == pytest.approx(-5.0)


def test_near_term_forecast_rain_defers_only_until_configured_limit() -> None:
    first_defer, first_reason = should_defer_watering(
        7.0,
        forecast_rain_mm=4.0,
        deferred_windows=0,
        min_balance_mm=5.0,
        max_defer_windows=2,
    )
    second_defer, _ = should_defer_watering(
        7.0,
        forecast_rain_mm=4.0,
        deferred_windows=1,
        min_balance_mm=5.0,
        max_defer_windows=2,
    )
    forced_run, forced_reason = should_defer_watering(
        7.0,
        forecast_rain_mm=4.0,
        deferred_windows=2,
        min_balance_mm=5.0,
        max_defer_windows=2,
    )

    assert first_defer is True
    assert second_defer is True
    assert "eső" in first_reason.lower()
    assert forced_run is False
    assert forced_reason


def test_deferring_a_window_increments_only_the_counter() -> None:
    state = AdaptiveBalance(
        balance_mm=7.0,
        last_accounted_date=date(2026, 7, 20),
    )

    deferred = defer_window(state)

    assert deferred.balance_mm == pytest.approx(7.0)
    assert deferred.last_accounted_date == date(2026, 7, 20)
    assert deferred.deferred_windows == 1


def test_maximum_event_depth_leaves_remaining_deficit() -> None:
    state = AdaptiveBalance(balance_mm=12.0)
    target = choose_irrigation_target(state.balance_mm, max_event_mm=5.0)
    settled = settle_completed_irrigation(
        state,
        applied_mm=target,
        completed_at=datetime(2026, 7, 20, 5, 0, tzinfo=UTC),
    )

    assert target == pytest.approx(5.0)
    assert settled.balance_mm == pytest.approx(7.0)
    assert settled.last_applied_mm == pytest.approx(5.0)
    assert settled.last_irrigation_at == datetime(2026, 7, 20, 5, 0, tzinfo=UTC)
    assert settled.deferred_windows == 0


def test_partial_depth_candidates_descend_to_half_millimetre() -> None:
    assert target_depth_candidates(3.0) == [3.0, 2.5, 2.0, 1.5, 1.0, 0.5]
    assert target_depth_candidates(3.2) == [3.2, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5]
    assert target_depth_candidates(0.8) == [0.8, 0.5]
    assert target_depth_candidates(0.5) == [0.5]
    assert target_depth_candidates(0.4) == []
    assert target_depth_candidates(0.0) == []


def test_balance_accounts_dates_without_an_enabled_program_window() -> None:
    state, _ = account_daily_balance(
        AdaptiveBalance(),
        date(2026, 7, 20),
        etc_mm=3.0,
        effective_rain_mm=0.0,
        max_rain_credit_mm=10.0,
    )

    # Tuesday has no enabled watering window. Its ET still belongs in the
    # multi-day ledger and must not consume Monday's unmet need.
    reloaded = AdaptiveBalance.from_dict(state.as_dict())
    assert reloaded.balance_mm == pytest.approx(3.0)

    reloaded, _ = account_daily_balance(
        reloaded,
        date(2026, 7, 21),
        etc_mm=3.0,
        effective_rain_mm=0.0,
        max_rain_credit_mm=10.0,
    )
    reloaded, _ = account_daily_balance(
        reloaded,
        date(2026, 7, 22),
        etc_mm=3.0,
        effective_rain_mm=0.0,
        max_rain_credit_mm=10.0,
    )
    assert reloaded.balance_mm == pytest.approx(9.0)


def test_forecast_rain_horizon_uses_only_relevant_future_hours() -> None:
    starts_at = datetime(2026, 7, 20, 5, 0, tzinfo=UTC)
    hours = [
        _forecast_hour(starts_at - timedelta(hours=1), precipitation_mm=9.0),
        _forecast_hour(starts_at, precipitation_mm=1.0),
        _forecast_hour(starts_at + timedelta(hours=5), precipitation_mm=2.0),
        _forecast_hour(starts_at + timedelta(hours=6), precipitation_mm=7.0),
    ]

    assert forecast_rain_in_horizon(hours, starts_at, hours=6) == pytest.approx(3.0)


def test_legacy_program_without_adaptive_fields_remains_fixed() -> None:
    program = IrrigationProgram.from_dict(
        {
            "program_id": "legacy",
            "name": "Régi fix program",
            "weekdays": [0],
            "start_time": "05:30",
            "zones": [{"entity_id": "switch.gyep", "duration_minutes": 20}],
        }
    )

    assert program.schedule_mode == "fixed"
    assert program.start_time == "05:30"


def test_humidity_forecast_normalization_accepts_ha_aliases_and_bounds_values() -> None:
    base = {
        "datetime": "2026-07-20T05:00:00+00:00",
        "temperature": 24,
        "precipitation": 0,
        "precipitation_probability": 0,
        "condition": "sunny",
    }

    normalized = normalize_ha_forecast(
        [
            {**base, "humidity": 42},
            {**base, "datetime": "2026-07-20T06:00:00+00:00", "relative_humidity": 110},
            {**base, "datetime": "2026-07-20T07:00:00+00:00", "native_humidity": -4},
            {**base, "datetime": "2026-07-20T08:00:00+00:00", "humidity": "unknown"},
        ]
    )

    assert [hour.humidity_percent for hour in normalized] == [42.0, 100.0, 0.0, None]


def test_missing_humidity_is_neutral_while_dry_air_increases_et() -> None:
    starts_at = datetime(2026, 7, 20, tzinfo=UTC)

    def daily(humidity: float | None) -> list[ForecastHour]:
        return [
            ForecastHour(
                timestamp=starts_at + timedelta(hours=index),
                temperature=19.0 + min(index, 10),
                precipitation_mm=0.0,
                precipitation_probability=0.0,
                condition="sunny",
                cloud_cover=15.0,
                is_daylight=6 <= index < 20,
                wind_speed_kmh=8.0,
                humidity_percent=humidity,
            )
            for index in range(24)
        ]

    missing = estimate_daily_evapotranspiration(daily(None), latitude=47.5)
    dry = estimate_daily_evapotranspiration(daily(25.0), latitude=47.5)
    humid = estimate_daily_evapotranspiration(daily(90.0), latitude=47.5)

    assert missing.average_humidity_percent is None
    assert missing.humidity_factor == pytest.approx(1.0)
    assert dry.average_humidity_percent == pytest.approx(25.0)
    assert dry.humidity_factor > 1.0
    assert humid.average_humidity_percent == pytest.approx(90.0)
    assert humid.humidity_factor < 1.0
    assert dry.adjusted_et0_mm > missing.adjusted_et0_mm > humid.adjusted_et0_mm


def test_zone_without_soil_sensor_does_not_block_adaptive_watering() -> None:
    assessment = assess_soil_moisture(None)

    assert assessment.action == "unavailable"
    assert assessment.factor == pytest.approx(1.0)


def test_moisture_reduction_splits_physical_and_soil_satisfaction() -> None:
    split = _standalone_manager_function("_adaptive_satisfaction_depths")

    assert split(5.0, 2.0, "reduce") == pytest.approx((5.0, 3.0))
    assert split(5.0, 0.0, "skip") == pytest.approx((5.0, 5.0))
    assert split(5.0, 5.0, "not_configured") == pytest.approx((5.0, 0.0))


def test_partial_stop_debits_elapsed_water_plus_soil_satisfied_share() -> None:
    completed_depth = _standalone_manager_function("_completed_adaptive_depth")
    zones = [
        {
            "moisture_action": "not_configured",
            "adaptive_applied_mm": 5.0,
            "adaptive_soil_satisfied_mm": 0.0,
            "outcome": "completed",
        },
        {
            "moisture_action": "reduce",
            "adaptive_applied_mm": 1.0,
            "adaptive_soil_satisfied_mm": 3.0,
            "outcome": "stopped",
        },
    ]

    assert completed_depth(zones) == pytest.approx(4.5)


def test_unstarted_moisture_reduced_zone_keeps_its_soil_credit() -> None:
    completed_depth = _standalone_manager_function("_completed_adaptive_depth")
    zones = [
        {
            "moisture_action": "not_configured",
            "adaptive_applied_mm": 5.0,
            "adaptive_soil_satisfied_mm": 0.0,
            "outcome": "completed",
        },
        {
            "moisture_action": "reduce",
            "adaptive_applied_mm": 2.0,
            "adaptive_soil_satisfied_mm": 3.0,
            "outcome": "pending",
        },
    ]

    assert completed_depth(zones) == pytest.approx(4.0)


def test_manager_settles_every_confirmed_partial_delivery() -> None:
    function = _function_node("_async_execute_program")
    settlement_calls = [
        node
        for node in ast.walk(function)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "settle_completed_irrigation"
    ]
    guarded_calls = [
        call
        for guard in ast.walk(function)
        if isinstance(guard, ast.If)
        and "applied_depth > 0" in ast.unparse(guard.test)
        for call in ast.walk(guard)
        if call in settlement_calls
    ]

    assert len(settlement_calls) == 1
    assert guarded_calls == settlement_calls


def test_adaptive_runtime_tries_smaller_depths_before_no_fit() -> None:
    source = _function_source("async_run_program")

    candidates_at = source.index("target_depth_candidates")
    slot_at = source.index("select_smart_watering_slot", candidates_at)
    planned_at = source.index("candidate_choice.status == 'planned'", slot_at)

    assert candidates_at < slot_at < planned_at


def test_preview_exposes_adaptive_balance_and_partial_planning_contract() -> None:
    source = _function_source("async_three_day_preview")
    partial_planner = _function_source("_preview_adaptive_slot")

    for field in (
        "water_balance_before_mm",
        "daily_water_need_mm",
        "forecast_rain_mm",
        "irrigation_target_mm",
        "remaining_balance_mm",
        "selection_reason",
    ):
        assert field in source
    assert "water_need_deferred" in source
    assert "_preview_adaptive_slot" in source
    assert "target_depth_candidates" in partial_planner
    assert "candidate_target" in partial_planner
    assert "status='no_fit'" in partial_planner
    assert "smart_no_fit" in source


def test_preview_accounts_intermediate_days_without_program_occurrences() -> None:
    function = _function_node("async_three_day_preview")
    calendar_loop = next(
        node
        for node in ast.walk(function)
        if isinstance(node, ast.While)
        and "cursor <= target_at.date()" in ast.unparse(node.test)
    )
    loop_source = ast.unparse(calendar_loop)

    assert "_preview_account_balance" in loop_source
    assert "cursor += timedelta(days=1)" in loop_source
    assert "for day in days" in ast.unparse(function)


def test_preview_settles_only_a_run_that_will_really_execute() -> None:
    function = _function_node("async_three_day_preview")
    source = ast.unparse(function)
    settlement_calls = [
        node
        for node in ast.walk(function)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "settle_completed_irrigation"
    ]
    execution_guards = [
        guard
        for guard in ast.walk(function)
        if isinstance(guard, ast.If)
        and "status == 'will_run'" in ast.unparse(guard.test)
        and "smart_choice.status == 'planned'" in ast.unparse(guard.test)
        and "irrigation_target_mm > 0" in ast.unparse(guard.test)
    ]

    assert len(settlement_calls) == 1
    assert len(execution_guards) == 1
    assert settlement_calls[0] in list(ast.walk(execution_guards[0]))
    for non_run_status in (
        "automation_off",
        "paused",
        "skip_next",
        "condition_skip",
        "moisture_skip",
    ):
        assert f"status = '{non_run_status}'" in source
        assert source.index(f"status = '{non_run_status}'") < source.index(
            "settle_completed_irrigation"
        )
