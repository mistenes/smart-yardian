"""WebSocket API consumed by the Smart Yardian panel."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import DOMAIN, WS_PREFIX
from .manager import SmartYardianManager


def _manager(hass: HomeAssistant) -> SmartYardianManager:
    managers = hass.data.get(DOMAIN, {})
    for key, manager in managers.items():
        if not key.startswith("_") and isinstance(manager, SmartYardianManager):
            return manager
    raise ValueError("A Smart Yardian integráció nincs beállítva.")


@websocket_api.websocket_command({vol.Required("type"): f"{WS_PREFIX}/summary"})
@websocket_api.async_response
async def websocket_summary(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the full panel snapshot."""
    connection.send_result(msg["id"], _manager(hass).summary())


@websocket_api.websocket_command({vol.Required("type"): f"{WS_PREFIX}/weather/preview"})
@websocket_api.async_response
async def websocket_weather_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    connection.send_result(msg["id"], await _manager(hass).async_preview_weather())


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/program/save",
        vol.Required("program"): dict,
    }
)
@websocket_api.async_response
async def websocket_program_save(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    try:
        program = await _manager(hass).async_save_program(msg["program"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_program", str(err))
        return
    connection.send_result(msg["id"], program.as_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/program/delete",
        vol.Required("program_id"): str,
    }
)
@websocket_api.async_response
async def websocket_program_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    try:
        await _manager(hass).async_delete_program(msg["program_id"])
    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
        return
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/settings/update",
        vol.Required("settings"): dict,
    }
)
@websocket_api.async_response
async def websocket_settings_update(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    try:
        await _manager(hass).async_update_settings(msg["settings"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_settings", str(err))
        return
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/zone_profiles/update",
        vol.Required("profiles"): [dict],
    }
)
@websocket_api.async_response
async def websocket_zone_profiles_update(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update sprinkler type and hydraulic data for zones."""
    try:
        await _manager(hass).async_update_zone_profiles(msg["profiles"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_zone_profile", str(err))
        return
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/automation/set",
        vol.Required("enabled"): bool,
    }
)
@websocket_api.async_response
async def websocket_automation_set(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    await _manager(hass).async_set_automation(msg["enabled"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/run/program",
        vol.Required("program_id"): str,
        vol.Optional("apply_weather", default=True): bool,
    }
)
@websocket_api.async_response
async def websocket_run_program(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _manager(hass)
    try:
        program = manager.get_program(msg["program_id"])
    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
        return
    manager._create_task(  # noqa: SLF001 - command intentionally delegates task ownership
        manager.async_run_program(program, apply_weather=msg["apply_weather"]),
        f"{DOMAIN}_manual_program_{program.program_id}",
    )
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/run/zone",
        vol.Required("entity_id"): str,
        vol.Required("duration_minutes"): vol.All(int, vol.Range(min=1, max=180)),
    }
)
@websocket_api.async_response
async def websocket_run_zone(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _manager(hass)
    if msg["entity_id"] not in manager.zone_entities:
        connection.send_error(msg["id"], "invalid_zone", "Ismeretlen Yardian zóna.")
        return
    manager._create_task(  # noqa: SLF001
        manager.async_run_manual_zone(msg["entity_id"], msg["duration_minutes"]),
        f"{DOMAIN}_manual_zone",
    )
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): f"{WS_PREFIX}/run/stop"})
@websocket_api.async_response
async def websocket_stop(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    await _manager(hass).async_stop_all()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/program/skip_next",
        vol.Required("program_id"): str,
    }
)
@websocket_api.async_response
async def websocket_skip_next(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    try:
        await _manager(hass).async_skip_next(msg["program_id"])
    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
        return
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{WS_PREFIX}/pause_until",
        vol.Optional("until"): vol.Any(str, None),
    }
)
@websocket_api.async_response
async def websocket_pause_until(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    try:
        until = datetime.fromisoformat(msg["until"]) if msg.get("until") else None
    except ValueError:
        connection.send_error(msg["id"], "invalid_datetime", "Érvénytelen időpont.")
        return
    await _manager(hass).async_pause_until(until)
    connection.send_result(msg["id"])


COMMANDS = (
    websocket_summary,
    websocket_weather_preview,
    websocket_program_save,
    websocket_program_delete,
    websocket_settings_update,
    websocket_zone_profiles_update,
    websocket_automation_set,
    websocket_run_program,
    websocket_run_zone,
    websocket_stop,
    websocket_skip_next,
    websocket_pause_until,
)


def async_register(hass: HomeAssistant) -> None:
    """Register all panel commands once."""
    for command in COMMANDS:
        websocket_api.async_register_command(hass, command)
