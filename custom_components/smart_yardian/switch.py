"""Automation switch for Smart Yardian."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import DOMAIN
from .manager import SmartYardianManager


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    manager: SmartYardianManager = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([SmartYardianAutomationSwitch(manager)])


class SmartYardianAutomationSwitch(SwitchEntity):
    """Enable or disable scheduled programs."""

    _attr_name = "Automatika"
    _attr_icon = "mdi:calendar-clock"
    _attr_has_entity_name = True

    def __init__(self, manager: SmartYardianManager) -> None:
        self.manager = manager
        self._attr_unique_id = f"{manager.entry_id}_automation"

    @property
    def is_on(self) -> bool:
        return bool(self.manager.store.settings.get("automation_enabled", True))

    async def async_turn_on(self, **kwargs: object) -> None:
        await self.manager.async_set_automation(True)

    async def async_turn_off(self, **kwargs: object) -> None:
        await self.manager.async_set_automation(False)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.manager.async_add_listener(self._handle_update))

    @callback
    def _handle_update(self) -> None:
        self.async_write_ha_state()
