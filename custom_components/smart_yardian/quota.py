"""Persistent daily OpenWeather request quota."""

from __future__ import annotations

import asyncio
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, OPENWEATHER_DAILY_LIMIT
from .weather import reserve_daily_request

_DATA_KEY = "_openweather_quota"
_STORE_KEY = f"{DOMAIN}.openweather_quota"


class OpenWeatherDailyQuota:
    """Reserve and persist real HTTP requests before they are sent."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store = Store[dict[str, Any]](hass, 1, _STORE_KEY)
        self._initialize_lock = asyncio.Lock()
        self._reserve_lock = asyncio.Lock()
        self._initialized = False
        self._date = ""
        self._count = 0

    async def async_initialize(self) -> None:
        """Load persisted quota state exactly once."""
        if self._initialized:
            return
        async with self._initialize_lock:
            if self._initialized:
                return
            data = await self._store.async_load() or {}
            self._date = str(data.get("date") or "")
            self._count = max(0, int(data.get("count") or 0))
            self._initialized = True

    async def async_reserve(self) -> None:
        """Reserve one request or reject it before any HTTP traffic."""
        await self.async_initialize()
        async with self._reserve_lock:
            today = dt_util.utcnow().date().isoformat()
            state = reserve_daily_request(
                {"date": self._date, "count": self._count},
                today,
                OPENWEATHER_DAILY_LIMIT,
            )
            self._date = str(state["date"])
            self._count = int(state["count"])
            await self._store.async_save(
                {"date": self._date, "count": self._count}
            )

    def as_dict(self) -> dict[str, Any]:
        """Return the current UTC-day quota summary."""
        today = dt_util.utcnow().date().isoformat()
        count = self._count if self._date == today else 0
        return {
            "date": today,
            "count": count,
            "limit": OPENWEATHER_DAILY_LIMIT,
            "remaining": max(0, OPENWEATHER_DAILY_LIMIT - count),
        }


async def async_get_openweather_quota(
    hass: HomeAssistant,
) -> OpenWeatherDailyQuota:
    """Return the single HA-wide persistent quota instance."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    quota = domain_data.get(_DATA_KEY)
    if not isinstance(quota, OpenWeatherDailyQuota):
        quota = OpenWeatherDailyQuota(hass)
        domain_data[_DATA_KEY] = quota
    await quota.async_initialize()
    return quota
