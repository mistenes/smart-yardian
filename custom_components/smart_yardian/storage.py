"""Persistent storage wrapper for Smart Yardian."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DEFAULT_SETTINGS, MAX_HISTORY, STORE_KEY_PREFIX, STORE_VERSION
from .irrigation import ZoneProfile
from .models import IrrigationProgram


class SmartYardianStore:
    """Versioned storage for programs, settings and run history."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self._store = Store[dict[str, Any]](
            hass, STORE_VERSION, f"{STORE_KEY_PREFIX}.{entry_id}"
        )
        self.programs: list[IrrigationProgram] = []
        self.settings: dict[str, Any] = dict(DEFAULT_SETTINGS)
        self.history: list[dict[str, Any]] = []
        self.runtime: dict[str, Any] = {}
        self.zone_profiles: dict[str, ZoneProfile] = {}

    async def async_load(self) -> None:
        """Load and validate persisted state."""
        data = await self._store.async_load() or {}
        self.settings.update(data.get("settings") or {})
        self.history = list(data.get("history") or [])[-MAX_HISTORY:]
        self.runtime = dict(data.get("runtime") or {})
        profiles: dict[str, ZoneProfile] = {}
        for entity_id, raw in (data.get("zone_profiles") or {}).items():
            try:
                profile = ZoneProfile.from_dict(
                    {**dict(raw), "entity_id": entity_id}
                )
                profiles[entity_id] = profile
            except (KeyError, TypeError, ValueError):
                continue
        self.zone_profiles = profiles
        programs: list[IrrigationProgram] = []
        for raw in data.get("programs") or []:
            try:
                programs.append(IrrigationProgram.from_dict(raw))
            except (KeyError, TypeError, ValueError):
                continue
        self.programs = programs

    async def async_save(self) -> None:
        """Persist current state immediately."""
        await self._store.async_save(
            {
                "programs": [program.as_dict() for program in self.programs],
                "settings": self.settings,
                "history": self.history[-MAX_HISTORY:],
                "runtime": self.runtime,
                "zone_profiles": {
                    entity_id: profile.as_dict()
                    for entity_id, profile in self.zone_profiles.items()
                },
            }
        )

    async def async_add_history(self, record: dict[str, Any]) -> None:
        """Append an audit record and trim old data."""
        self.history.append(record)
        self.history = self.history[-MAX_HISTORY:]
        await self.async_save()
