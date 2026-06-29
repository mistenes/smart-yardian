"""Smart Yardian Home Assistant integration."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_ENTITY_ID, Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .const import (
    DOMAIN,
    SERVICE_PAUSE_UNTIL,
    SERVICE_RUN_PROGRAM,
    SERVICE_SKIP_NEXT,
    SERVICE_START_ZONE,
    SERVICE_STOP_ALL,
)
from .manager import SmartYardianManager
from .panel import async_register_panel, async_remove_panel
from .websocket import async_register as async_register_websocket

PLATFORMS = [Platform.SENSOR, Platform.SWITCH, Platform.BUTTON]


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Initialize domain storage."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up a configured Smart Yardian instance."""
    hass.data.setdefault(DOMAIN, {})
    manager = SmartYardianManager(hass, entry.entry_id, dict(entry.data))
    hass.data[DOMAIN][entry.entry_id] = manager
    await manager.async_setup()

    if not hass.data[DOMAIN].get("_websocket_registered"):
        async_register_websocket(hass)
        hass.data[DOMAIN]["_websocket_registered"] = True
    if not hass.data[DOMAIN].get("_services_registered"):
        _register_services(hass)
        hass.data[DOMAIN]["_services_registered"] = True
    if not hass.data[DOMAIN].get("_panel_registered"):
        await async_register_panel(
            hass,
            register_static=not hass.data[DOMAIN].get("_static_registered", False),
        )
        hass.data[DOMAIN]["_static_registered"] = True
        hass.data[DOMAIN]["_panel_registered"] = True

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload an integration entry."""
    manager: SmartYardianManager = hass.data[DOMAIN][entry.entry_id]
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    await manager.async_unload()
    hass.data[DOMAIN].pop(entry.entry_id)
    remaining = [
        value
        for key, value in hass.data[DOMAIN].items()
        if not key.startswith("_")
    ]
    if not remaining:
        async_remove_panel(hass)
        hass.data[DOMAIN]["_panel_registered"] = False
    return True


def _first_manager(hass: HomeAssistant) -> SmartYardianManager:
    for key, manager in hass.data[DOMAIN].items():
        if not key.startswith("_"):
            return manager
    raise ValueError("A Smart Yardian integráció nincs beállítva.")


def _register_services(hass: HomeAssistant) -> None:
    async def run_program(call: ServiceCall) -> None:
        manager = _first_manager(hass)
        program = manager.get_program(call.data["program_id"])
        manager._create_task(  # noqa: SLF001
            manager.async_run_program(
                program,
                apply_weather=call.data.get("apply_weather", True),
            ),
            f"{DOMAIN}_service_program",
        )

    async def start_zone(call: ServiceCall) -> None:
        manager = _first_manager(hass)
        manager._create_task(  # noqa: SLF001
            manager.async_run_manual_zone(
                call.data[ATTR_ENTITY_ID],
                call.data["duration_minutes"],
            ),
            f"{DOMAIN}_service_zone",
        )

    async def stop_all(call: ServiceCall) -> None:
        await _first_manager(hass).async_stop_all()

    async def skip_next(call: ServiceCall) -> None:
        await _first_manager(hass).async_skip_next(call.data["program_id"])

    async def pause_until(call: ServiceCall) -> None:
        value = call.data.get("until")
        until = datetime.fromisoformat(value) if value else None
        await _first_manager(hass).async_pause_until(until)

    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_PROGRAM,
        run_program,
        schema=vol.Schema(
            {
                vol.Required("program_id"): str,
                vol.Optional("apply_weather", default=True): cv.boolean,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_START_ZONE,
        start_zone,
        schema=vol.Schema(
            {
                vol.Required(ATTR_ENTITY_ID): cv.entity_id,
                vol.Required("duration_minutes"): vol.All(
                    vol.Coerce(int), vol.Range(min=1, max=180)
                ),
            }
        ),
    )
    hass.services.async_register(DOMAIN, SERVICE_STOP_ALL, stop_all)
    hass.services.async_register(
        DOMAIN,
        SERVICE_SKIP_NEXT,
        skip_next,
        schema=vol.Schema({vol.Required("program_id"): str}),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_PAUSE_UNTIL,
        pause_until,
        schema=vol.Schema({vol.Optional("until"): vol.Any(str, None)}),
    )
