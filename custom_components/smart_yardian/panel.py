"""Register and remove the bundled Home Assistant panel."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import (
    PANEL_COMPONENT,
    PANEL_MODULE_URL,
    PANEL_STATIC_URL,
    PANEL_URL,
)


async def async_register_panel(
    hass: HomeAssistant,
    *,
    register_static: bool = True,
) -> None:
    """Serve the bundle and add it to the sidebar."""
    bundle = Path(__file__).parent / "frontend" / "smart-yardian-panel.js"
    if register_static:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(PANEL_STATIC_URL, str(bundle), False)]
        )
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=PANEL_COMPONENT,
        sidebar_title="Öntözés",
        sidebar_icon="mdi:water",
        module_url=PANEL_MODULE_URL,
        embed_iframe=False,
        trust_external=False,
        require_admin=False,
    )


def async_remove_panel(hass: HomeAssistant) -> None:
    """Remove the sidebar panel."""
    frontend.async_remove_panel(hass, PANEL_URL)
