"""Weather providers and the green-lawn irrigation calculation."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Iterable
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any

from .const import (
    FORECAST_HORIZON_HOURS,
    MIN_FORECAST_HOURS,
    OPENWEATHER_CACHE_SECONDS,
    OPENWEATHER_DAILY_LIMIT,
    OPENWEATHER_URL,
)
from .models import ForecastHour, WeatherDecision

RAINY_CONDITIONS = {
    "rainy",
    "pouring",
    "lightning-rainy",
    "snowy-rainy",
    "hail",
}
SUN_WEIGHTS = {
    "sunny": 1.0,
    "partlycloudy": 0.5,
    "cloudy": 0.15,
    "clear-night": 0.0,
}


class WeatherUnavailableError(RuntimeError):
    """Raised when a provider has no trustworthy forecast."""


class OpenWeatherAuthenticationError(WeatherUnavailableError):
    """Raised for invalid or unauthorized OpenWeather credentials."""


class OpenWeatherRateLimitError(WeatherUnavailableError):
    """Raised when the OpenWeather quota is exhausted."""


def reserve_daily_request(
    state: dict[str, Any],
    today: str,
    limit: int = OPENWEATHER_DAILY_LIMIT,
) -> dict[str, Any]:
    """Return the state after reserving one request or raise at the limit."""
    count = int(state.get("count") or 0) if state.get("date") == today else 0
    if count >= limit:
        raise OpenWeatherRateLimitError(
            f"A Smart Yardian elérte a napi {limit} OpenWeather-hívás korlátot."
        )
    return {"date": today, "count": count + 1}


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def is_plausible_celsius(value: float) -> bool:
    """Return whether a temperature is credible for an outdoor forecast."""
    return -60 <= value <= 60


def _ha_celsius_temperature(value: Any) -> float:
    """Validate a Home Assistant forecast value declared as Celsius."""
    temperature = _as_float(value)
    if not is_plausible_celsius(temperature):
        raise WeatherUnavailableError(
            f"Az Időkép érvénytelen hőmérsékletet adott: {temperature:g} °C."
        )
    return temperature


def _openweather_celsius_temperature(value: Any) -> float:
    """Normalize OpenWeather metric output and defensive Kelvin fallback."""
    temperature = _as_float(value)
    if temperature > 100:
        temperature -= 273.15
    if not is_plausible_celsius(temperature):
        raise WeatherUnavailableError(
            f"Az OpenWeather érvénytelen hőmérsékletet adott: {temperature:g} °C."
        )
    return temperature


def _parse_timestamp(value: Any) -> datetime:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, UTC)
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def normalize_ha_forecast(items: Iterable[dict[str, Any]]) -> list[ForecastHour]:
    """Normalize Home Assistant weather.get_forecasts output."""
    normalized: list[ForecastHour] = []
    for item in items:
        try:
            timestamp = _parse_timestamp(item["datetime"])
            condition = str(item.get("condition") or "unknown")
            local_hour = timestamp.astimezone().hour
            normalized.append(
                ForecastHour(
                    timestamp=timestamp,
                    temperature=_ha_celsius_temperature(item.get("temperature")),
                    precipitation_mm=max(0.0, _as_float(item.get("precipitation"))),
                    precipitation_probability=max(
                        0.0,
                        min(100.0, _as_float(item.get("precipitation_probability"))),
                    ),
                    condition=condition,
                    cloud_cover=(
                        _as_float(item.get("cloud_coverage"))
                        if item.get("cloud_coverage") is not None
                        else None
                    ),
                    is_daylight=condition != "clear-night" and 6 <= local_hour < 20,
                )
            )
        except (KeyError, TypeError, ValueError):
            continue
    return normalized


def normalize_openweather(items: Iterable[dict[str, Any]]) -> list[ForecastHour]:
    """Normalize One Call API 4.0 hourly timeline output."""
    normalized: list[ForecastHour] = []
    for item in items:
        try:
            weather = (item.get("weather") or [{}])[0]
            icon = str(weather.get("icon") or "")
            rain = item.get("rain") or {}
            snow = item.get("snow") or {}
            normalized.append(
                ForecastHour(
                    timestamp=_parse_timestamp(item["dt"]),
                    temperature=_openweather_celsius_temperature(item.get("temp")),
                    precipitation_mm=max(
                        0.0,
                        _as_float(rain.get("1h")) + _as_float(snow.get("1h")),
                    ),
                    precipitation_probability=max(
                        0.0, min(100.0, _as_float(item.get("pop")) * 100)
                    ),
                    condition=str(weather.get("main") or "unknown").lower(),
                    cloud_cover=max(0.0, min(100.0, _as_float(item.get("clouds")))),
                    is_daylight=icon.endswith("d") if icon else None,
                )
            )
        except (KeyError, TypeError, ValueError):
            continue
    return normalized


def _is_rainy(hour: ForecastHour) -> bool:
    condition = hour.condition.lower()
    return (
        hour.precipitation_mm > 0
        or condition in RAINY_CONDITIONS
        or "rain" in condition
        or "zápor" in condition
        or "eső" in condition
    )


def _sun_weight(hour: ForecastHour) -> float:
    if hour.is_daylight is False:
        return 0.0
    if hour.cloud_cover is not None:
        return max(0.0, 1.0 - hour.cloud_cover / 100.0)
    return SUN_WEIGHTS.get(hour.condition.lower(), 0.25)


def forecast_day_max_temperature(
    forecast: Iterable[ForecastHour],
    scheduled_at: datetime,
) -> float:
    """Return the maximum temperature for the scheduled local calendar day."""
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=UTC)
    timezone = scheduled_at.tzinfo
    target_date = scheduled_at.date()
    temperatures = [
        hour.temperature
        for hour in forecast
        if hour.timestamp.astimezone(timezone).date() == target_date
    ]
    if not temperatures:
        raise WeatherUnavailableError(
            "Nincs hőmérsékleti előrejelzés a program naptári napjára."
        )
    return round(max(temperatures), 1)


def evaluate_calendar_day(
    forecast: Iterable[ForecastHour],
    source: str,
    scheduled_at: datetime,
    settings: dict[str, Any] | None = None,
) -> WeatherDecision:
    """Evaluate one shared weather decision for a local calendar day."""
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=UTC)
    timezone = scheduled_at.tzinfo
    target_date = scheduled_at.date()
    hours = sorted(
        (
            hour
            for hour in forecast
            if hour.timestamp.astimezone(timezone).date() == target_date
        ),
        key=lambda item: item.timestamp,
    )
    if len(hours) < MIN_FORECAST_HOURS:
        raise WeatherUnavailableError(
            "Nincs legalább 12 órányi használható előrejelzés erre a napra."
        )
    decision = evaluate_green_lawn(
        hours,
        source,
        now=hours[0].timestamp,
        settings=settings,
    )
    return replace(
        decision,
        max_temperature=round(max(hour.temperature for hour in hours), 1),
    )


def evaluate_green_lawn(
    forecast: Iterable[ForecastHour],
    source: str,
    now: datetime | None = None,
    settings: dict[str, Any] | None = None,
) -> WeatherDecision:
    """Evaluate the explainable green-lawn watering preset."""
    now = now or datetime.now(UTC)
    if now.tzinfo is None:
        now = now.replace(tzinfo=UTC)
    settings = settings or {}
    horizon = now + timedelta(hours=FORECAST_HORIZON_HOURS)
    hours = sorted(
        (hour for hour in forecast if now <= hour.timestamp <= horizon),
        key=lambda item: item.timestamp,
    )
    if len(hours) < MIN_FORECAST_HOURS:
        raise WeatherUnavailableError("Nincs legalább 12 órányi használható előrejelzés.")

    precipitation = sum(hour.precipitation_mm for hour in hours)
    probability = max(hour.precipitation_probability for hour in hours)
    max_temperature = max(hour.temperature for hour in hours)
    rainy_hours = sum(1 for hour in hours if _is_rainy(hour))
    sunny_hours = sum(_sun_weight(hour) for hour in hours)

    skip_mm = float(settings.get("rain_skip_mm", 8.0))
    skip_probability = float(settings.get("rain_skip_probability", 80))
    skip_probability_mm = float(settings.get("rain_skip_probability_mm", 2.0))
    rainy_hours_skip = int(settings.get("rainy_hours_skip", 3))

    skip = (
        precipitation >= skip_mm
        or (probability >= skip_probability and precipitation >= skip_probability_mm)
        or rainy_hours >= rainy_hours_skip
    )
    if skip:
        factor = 0.0
        rain_factor = 0.0
        climate_factor = 1.0
        reason = "A várható csapadék elegendő, ezért a program kimarad."
    else:
        if precipitation >= float(settings.get("rain_reduce_high_mm", 4.0)):
            rain_factor = float(settings.get("rain_factor_high", 0.65))
            rain_reason = "jelentős várható csapadék"
        elif precipitation >= float(settings.get("rain_reduce_low_mm", 1.0)):
            rain_factor = float(settings.get("rain_factor_low", 0.85))
            rain_reason = "kevés várható csapadék"
        else:
            rain_factor = 1.0
            rain_reason = "kevés csapadék"

        if max_temperature >= 32 and sunny_hours >= 8:
            climate_factor = 1.35
            climate_reason = "forró és napos idő"
        elif max_temperature >= 28 and sunny_hours >= 6:
            climate_factor = 1.20
            climate_reason = "meleg és többnyire napos idő"
        elif max_temperature >= 24 and sunny_hours >= 4:
            climate_factor = 1.10
            climate_reason = "meleg, részben napos idő"
        elif max_temperature < 20 and sunny_hours < 3:
            climate_factor = 0.90
            climate_reason = "hűvös és felhős idő"
        else:
            climate_factor = 1.0
            climate_reason = "átlagos párolgás"

        factor = rain_factor * climate_factor
        factor = max(
            float(settings.get("factor_min", 0.5)),
            min(float(settings.get("factor_max", 1.5)), factor),
        )
        reason = f"{rain_reason.capitalize()}, {climate_reason}."

    return WeatherDecision(
        factor=round(factor, 3),
        source=source,
        precipitation_mm=round(precipitation, 1),
        max_probability=round(probability),
        max_temperature=round(max_temperature, 1),
        sunny_hours=round(sunny_hours, 1),
        rainy_hours=rainy_hours,
        reason=reason,
        evaluated_at=now,
        rain_factor=round(rain_factor, 3),
        climate_factor=round(climate_factor, 3),
    )


class OpenWeatherClient:
    """Small cached client for the One Call API 4.0 hourly timeline."""

    def __init__(
        self,
        session: Any,
        api_key: str,
        latitude: float,
        longitude: float,
        before_request: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        self._session = session
        self._api_key = api_key
        self._latitude = latitude
        self._longitude = longitude
        self._before_request = before_request
        self._cache: list[ForecastHour] | None = None
        self._cache_at: datetime | None = None
        self._lock = asyncio.Lock()

    async def async_validate(self) -> None:
        """Validate credentials with a real forecast request."""
        await self.async_fetch(force=True)

    def set_before_request(
        self, callback: Callable[[], Awaitable[None]]
    ) -> None:
        """Set a guard called only before a real HTTP request."""
        self._before_request = callback

    async def async_fetch(self, force: bool = False) -> list[ForecastHour]:
        """Fetch and cache the hourly timeline."""
        async with self._lock:
            now = datetime.now(UTC)
            if (
                not force
                and self._cache is not None
                and self._cache_at is not None
                and (now - self._cache_at).total_seconds() < OPENWEATHER_CACHE_SECONDS
            ):
                return self._cache

            params = {
                "lat": self._latitude,
                "lon": self._longitude,
                "appid": self._api_key,
                "units": "metric",
                "lang": "hu",
            }
            payload = await self._async_get_payload(OPENWEATHER_URL, params)
            items = list(payload.get("data") or [])
            next_url = payload.get("next")
            if next_url:
                next_payload = await self._async_get_payload(
                    str(next_url),
                    {
                        "appid": self._api_key,
                        "units": "metric",
                        "lang": "hu",
                    },
                )
                items.extend(next_payload.get("data") or [])

            forecast = normalize_openweather(items)
            if len(forecast) < MIN_FORECAST_HOURS:
                raise WeatherUnavailableError(
                    "Az OpenWeather nem adott elegendő órás előrejelzést."
                )
            self._cache = forecast
            self._cache_at = now
            return forecast

    async def _async_get_payload(
        self,
        url: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Fetch one quota-counted OpenWeather timeline page."""
        if self._before_request is not None:
            await self._before_request()
        try:
            async with self._session.get(
                url,
                params=params,
                timeout=15,
            ) as response:
                if response.status in (401, 403):
                    raise OpenWeatherAuthenticationError(
                        "Az OpenWeather API-kulcs nem érvényes vagy nincs 4.0 hozzáférése."
                    )
                if response.status == 429:
                    raise OpenWeatherRateLimitError(
                        "Az OpenWeather napi hívási kerete elfogyott."
                    )
                if response.status >= 500:
                    raise WeatherUnavailableError(
                        f"Az OpenWeather átmenetileg nem elérhető ({response.status})."
                    )
                if response.status >= 400:
                    raise WeatherUnavailableError(
                        f"Az OpenWeather hibás választ adott ({response.status})."
                    )
                return await response.json(content_type=None)
        except TimeoutError as err:
            raise WeatherUnavailableError(
                "Az OpenWeather kérés időtúllépés miatt leállt."
            ) from err
