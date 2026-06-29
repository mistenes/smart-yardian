"""Status sensors for Smart Yardian."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
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
    """Create Smart Yardian sensors."""
    manager: SmartYardianManager = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        [
            SmartYardianStatusSensor(manager),
            SmartYardianFactorSensor(manager),
            SmartYardianSourceSensor(manager),
            SmartYardianNextRunSensor(manager),
        ]
    )


class SmartYardianSensorBase(SensorEntity):
    """Shared update wiring."""

    _attr_has_entity_name = True

    def __init__(self, manager: SmartYardianManager, key: str, name: str) -> None:
        self.manager = manager
        self._attr_unique_id = f"{manager.entry_id}_{key}"
        self._attr_name = name

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.manager.async_add_listener(self._handle_update))

    @callback
    def _handle_update(self) -> None:
        self.async_write_ha_state()


class SmartYardianStatusSensor(SmartYardianSensorBase):
    """Overall scheduler state."""

    _attr_icon = "mdi:sprinkler-variant"

    def __init__(self, manager: SmartYardianManager) -> None:
        super().__init__(manager, "status", "Állapot")

    @property
    def native_value(self) -> str:
        return self.manager.status

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "active_run": self.manager.active_run,
            "last_error": self.manager.last_error,
        }


class SmartYardianFactorSensor(SmartYardianSensorBase):
    """Latest weather adjustment."""

    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:percent"

    def __init__(self, manager: SmartYardianManager) -> None:
        super().__init__(manager, "weather_factor", "Időjárási korrekció")

    @property
    def native_value(self) -> int | None:
        return (
            round(self.manager.last_decision.factor * 100)
            if self.manager.last_decision
            else None
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return self.manager.last_decision.as_dict() if self.manager.last_decision else {}


class SmartYardianSourceSensor(SmartYardianSensorBase):
    """Currently selected weather provider."""

    _attr_icon = "mdi:weather-partly-cloudy"

    def __init__(self, manager: SmartYardianManager) -> None:
        super().__init__(manager, "weather_source", "Időjárásforrás")

    @property
    def native_value(self) -> str:
        return (
            self.manager.last_decision.source
            if self.manager.last_decision
            else "Nincs értékelés"
        )


class SmartYardianNextRunSensor(SmartYardianSensorBase):
    """Next scheduled execution."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_icon = "mdi:clock-outline"

    def __init__(self, manager: SmartYardianManager) -> None:
        super().__init__(manager, "next_run", "Következő futás")

    @property
    def native_value(self) -> datetime | None:
        return self.manager.next_run()
