"""Regression tests for loading a fresh panel after HACS updates."""

from custom_components.smart_yardian.const import (
    PANEL_MODULE_URL,
    PANEL_STATIC_URL,
)


def test_panel_module_url_is_cache_busted_but_static_route_is_stable() -> None:
    assert "?" not in PANEL_STATIC_URL
    assert PANEL_MODULE_URL.startswith(f"{PANEL_STATIC_URL}?v=")
    assert PANEL_MODULE_URL != PANEL_STATIC_URL
