"""Tests for weather normalization and the green-lawn algorithm."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from custom_components.smart_yardian.models import ForecastHour
from custom_components.smart_yardian.weather import (
    WeatherUnavailableError,
    evaluate_green_lawn,
    forecast_day_max_temperature,
    is_plausible_celsius,
    normalize_ha_forecast,
    normalize_openweather,
)

NOW = datetime(2026, 7, 1, 4, 0, tzinfo=UTC)


def forecast(
    *,
    precipitation: float = 0,
    probability: float = 0,
    temperature: float = 29,
    cloud_cover: float = 30,
    rainy_hours: int = 0,
) -> list[ForecastHour]:
    return [
        ForecastHour(
            timestamp=NOW + timedelta(hours=index + 1),
            temperature=temperature,
            precipitation_mm=precipitation if index == 0 else 0,
            precipitation_probability=probability,
            condition="rainy" if index < rainy_hours else "sunny",
            cloud_cover=cloud_cover,
            is_daylight=6 <= (NOW + timedelta(hours=index + 1)).hour < 20,
        )
        for index in range(24)
    ]


def test_green_lawn_skips_heavy_rain() -> None:
    decision = evaluate_green_lawn(
        forecast(precipitation=8.4, probability=85),
        "Időkép",
        NOW,
    )
    assert decision.factor == 0
    assert decision.rain_factor == 0
    assert "kimarad" in decision.reason


def test_green_lawn_increases_hot_sunny_day() -> None:
    decision = evaluate_green_lawn(
        forecast(temperature=33, cloud_cover=5),
        "OpenWeather 4.0",
        NOW,
    )
    assert decision.factor == 1.35
    assert decision.rain_factor == 1
    assert decision.climate_factor == 1.35
    assert decision.sunny_hours >= 8
    assert "forró" in decision.reason


def test_green_lawn_reduces_for_light_rain() -> None:
    decision = evaluate_green_lawn(
        forecast(precipitation=2.4, probability=45, temperature=22, cloud_cover=70),
        "Időkép",
        NOW,
    )
    assert decision.factor == 0.85
    assert decision.rain_factor == 0.85


def test_green_lawn_requires_twelve_hours() -> None:
    with pytest.raises(WeatherUnavailableError, match="12 órányi"):
        evaluate_green_lawn(forecast()[:11], "Időkép", NOW)


def test_day_max_includes_hours_before_program_start() -> None:
    hours = forecast(temperature=28)
    hours[2].temperature = 36.1
    scheduled_at = NOW + timedelta(hours=10)

    assert forecast_day_max_temperature(hours, scheduled_at) == 36.1


def test_openweather_normalization() -> None:
    normalized = normalize_openweather(
        [
            {
                "dt": int(NOW.timestamp()),
                "temp": 28.5,
                "pop": 0.42,
                "clouds": 25,
                "rain": {"1h": 0.7},
                "weather": [{"main": "Rain", "icon": "10d"}],
            }
        ]
    )
    assert normalized[0].temperature == 28.5
    assert normalized[0].precipitation_probability == 42
    assert normalized[0].precipitation_mm == 0.7
    assert normalized[0].is_daylight is True


def test_openweather_kelvin_page_is_converted_to_celsius() -> None:
    normalized = normalize_openweather(
        [
            {
                "dt": int(NOW.timestamp()),
                "temp": 304.2,
                "pop": 0,
                "clouds": 10,
                "weather": [{"main": "Clear", "icon": "01d"}],
            }
        ]
    )

    assert normalized[0].temperature == pytest.approx(31.05)


def test_openweather_mixed_unit_pages_keep_correct_maximum() -> None:
    normalized = normalize_openweather(
        [
            {
                "dt": int(NOW.timestamp()),
                "temp": 36.9,
                "weather": [{"main": "Clear", "icon": "01d"}],
            },
            {
                "dt": int((NOW + timedelta(hours=1)).timestamp()),
                "temp": 304.2,
                "weather": [{"main": "Clear", "icon": "01d"}],
            },
        ]
    )

    assert max(hour.temperature for hour in normalized) == 36.9


def test_idokep_implausible_temperature_triggers_fallback() -> None:
    with pytest.raises(WeatherUnavailableError, match="297.8 °C"):
        normalize_ha_forecast(
            [
                {
                    "datetime": NOW.isoformat(),
                    "temperature": 297.8,
                    "condition": "sunny",
                    "precipitation": 0,
                    "precipitation_probability": 0,
                }
            ]
        )


def test_temperature_plausibility_guard() -> None:
    assert is_plausible_celsius(36.9)
    assert not is_plausible_celsius(297.8)
