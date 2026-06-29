"""Config flow for Smart Yardian."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    CONF_NOTIFY_SERVICE,
    CONF_OPENWEATHER_API_KEY,
    CONF_WEATHER_ENTITY,
    CONF_ZONE_ENTITIES,
    DOMAIN,
)
from .weather import OpenWeatherClient, WeatherUnavailableError


class SmartYardianConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Configure the integration through the UI."""

    VERSION = 1

    def _yardian_options(self) -> dict[str, str]:
        registry = er.async_get(self.hass)
        options: dict[str, str] = {}
        for entry in registry.entities.values():
            if entry.platform == "yardian" and entry.entity_id.startswith("switch."):
                state = self.hass.states.get(entry.entity_id)
                options[entry.entity_id] = state.name if state else entry.entity_id
        return options

    def _weather_options(self) -> dict[str, str]:
        return {
            state.entity_id: state.name
            for state in self.hass.states.async_all("weather")
        }

    def _schema(self, defaults: dict[str, Any] | None = None) -> vol.Schema:
        defaults = defaults or {}
        zones = self._yardian_options()
        weather = self._weather_options()
        weather_default = defaults.get(CONF_WEATHER_ENTITY) or next(
            iter(weather), ""
        )
        return vol.Schema(
            {
                vol.Required(
                    CONF_WEATHER_ENTITY,
                    default=weather_default,
                ): vol.In(weather),
                vol.Required(
                    CONF_ZONE_ENTITIES,
                    default=defaults.get(CONF_ZONE_ENTITIES, list(zones)),
                ): cv.multi_select(zones),
                vol.Required(
                    CONF_OPENWEATHER_API_KEY,
                    default=defaults.get(CONF_OPENWEATHER_API_KEY, ""),
                ): str,
                vol.Required(
                    CONF_LATITUDE,
                    default=defaults.get(CONF_LATITUDE, self.hass.config.latitude),
                ): vol.Coerce(float),
                vol.Required(
                    CONF_LONGITUDE,
                    default=defaults.get(CONF_LONGITUDE, self.hass.config.longitude),
                ): vol.Coerce(float),
                vol.Optional(
                    CONF_NOTIFY_SERVICE,
                    default=defaults.get(CONF_NOTIFY_SERVICE, ""),
                ): str,
            }
        )

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Handle initial setup."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                client = OpenWeatherClient(
                    async_get_clientsession(self.hass),
                    user_input[CONF_OPENWEATHER_API_KEY],
                    user_input[CONF_LATITUDE],
                    user_input[CONF_LONGITUDE],
                )
                await client.async_validate()
            except WeatherUnavailableError:
                errors["base"] = "cannot_connect"
            else:
                return self.async_create_entry(title="Smart Yardian", data=user_input)
        return self.async_show_form(
            step_id="user",
            data_schema=self._schema(user_input),
            errors=errors,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Update controller, weather and credentials."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                client = OpenWeatherClient(
                    async_get_clientsession(self.hass),
                    user_input[CONF_OPENWEATHER_API_KEY],
                    user_input[CONF_LATITUDE],
                    user_input[CONF_LONGITUDE],
                )
                await client.async_validate()
            except WeatherUnavailableError:
                errors["base"] = "cannot_connect"
            else:
                return self.async_update_reload_and_abort(entry, data=user_input)
        return self.async_show_form(
            step_id="reconfigure",
            data_schema=self._schema(user_input or dict(entry.data)),
            errors=errors,
        )
