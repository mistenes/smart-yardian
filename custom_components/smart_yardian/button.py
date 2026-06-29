"""Emergency stop button for Smart Yardian."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import DOMAIN
from .manager import SmartYardianManager


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    manager: SmartYardianManager = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([SmartYardianStopButton(manager)])


class SmartYardianStopButton(ButtonEntity):
    """Stop all configured zones."""

    _attr_name = "Minden leállítása"
    _attr_icon = "mdi:stop"
    _attr_has_entity_name = True

    def __init__(self, manager: SmartYardianManager) -> None:
        self.manager = manager
        self._attr_unique_id = f"{manager.entry_id}_stop_all"

    async def async_press(self) -> None:
        await self.manager.async_stop_all()
