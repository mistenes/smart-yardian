"""Regression tests for the irrigation queue timeout scope."""

from __future__ import annotations

import ast
from pathlib import Path


def _called_method_names(node: ast.AST) -> set[str]:
    return {
        child.func.attr
        for child in ast.walk(node)
        if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute)
    }


def test_queue_timeout_does_not_wrap_program_execution() -> None:
    """The 30-minute guard must stop after the run slot is acquired."""
    manager_path = (
        Path(__file__).parents[1]
        / "custom_components"
        / "smart_yardian"
        / "manager.py"
    )
    module = ast.parse(manager_path.read_text(encoding="utf-8"))
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
