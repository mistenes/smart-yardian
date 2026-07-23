"""Regression tests for the irrigation queue timeout scope."""

from __future__ import annotations

import ast
from pathlib import Path

MANAGER_PATH = (
    Path(__file__).parents[1]
    / "custom_components"
    / "smart_yardian"
    / "manager.py"
)


def _called_method_names(node: ast.AST) -> set[str]:
    return {
        child.func.attr
        for child in ast.walk(node)
        if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute)
    }


def _function_body(source: str, name: str) -> str:
    module = ast.parse(source)
    function = next(
        node
        for node in ast.walk(module)
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef))
        and node.name == name
    )
    return ast.get_source_segment(source, function) or ""


def test_queue_timeout_does_not_wrap_program_execution() -> None:
    """The 30-minute guard must stop after the run slot is acquired."""
    module = ast.parse(MANAGER_PATH.read_text(encoding="utf-8"))
    run_program = next(
        node
        for node in ast.walk(module)
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "async_run_program"
    )
    timeout_block = next(
        node
        for node in ast.walk(run_program)
        if isinstance(node, ast.AsyncWith)
        and "timeout" in _called_method_names(node)
    )

    timeout_calls = _called_method_names(timeout_block)
    assert "acquire" in timeout_calls
    assert "_async_wait_for_external_irrigation" in timeout_calls
    assert "_async_execute_program" not in timeout_calls


def test_state_confirmation_forces_refresh_and_safety_stop_tracks_current_zone() -> None:
    source = MANAGER_PATH.read_text()

    wait_state = _function_body(source, "_async_wait_state")
    stop_all = _function_body(source, "async_stop_all")

    assert '"update_entity"' in wait_state
    assert "blocking=False" in wait_state
    assert "state.state not in UNAVAILABLE_STATES" in wait_state
    assert 'self.active_run.get("current_zone")' in stop_all


def test_zone_runtime_applies_moisture_and_zero_minutes_never_start_hardware() -> None:
    source = MANAGER_PATH.read_text()

    zone_details = _function_body(source, "_zone_run_details")
    execute_program = _function_body(source, "_async_execute_program")
    moisture_context = _function_body(source, "_soil_moisture_context")

    assert "adjust_duration_for_soil_moisture" in zone_details
    assert '"moisture_action": "not_configured"' in moisture_context
    assert '"moisture_factor": 1.0' in moisture_context
    assert 'if duration <= 0:' in execute_program
    assert 'result["outcome"] = "skipped"' in execute_program


def test_scheduler_primes_and_retains_forecast_before_program_start() -> None:
    source = MANAGER_PATH.read_text()

    minute_tick = _function_body(source, "_async_minute_tick")
    prime_forecast = _function_body(source, "_async_prime_idokep_forecast")
    serialized_fetch = _function_body(source, "_async_idokep_forecast")
    idokep_forecast = _function_body(source, "_async_fetch_idokep_forecast")
    update_settings = _function_body(source, "async_update_settings")

    assert "self._async_prime_idokep_forecast(local_now)" in minute_tick
    assert "await self._async_prime_idokep_forecast(local_now)" not in minute_tick
    assert "_idokep_forecast_attempted_at" in prime_forecast
    assert "except Exception" in prime_forecast
    assert "async with self._idokep_forecast_cache_lock" in serialized_fetch
    assert "await self._async_fetch_idokep_forecast()" in serialized_fetch
    assert "merge_hourly_forecast_cache" in idokep_forecast
    assert "async with self._idokep_forecast_cache_lock" in update_settings
    assert "self._clear_idokep_forecast_cache()" in update_settings
