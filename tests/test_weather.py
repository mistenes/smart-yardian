"""Tests for weather normalization and the green-lawn algorithm."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from custom_components.smart_yardian.models import ForecastHour
from custom_components.smart_yardian.weather import (
    WeatherUnavailableError,
    evaluate_calendar_day,
    evaluate_green_lawn,
    forecast_day_max_temperature,
    is_plausible_celsius,
    normalize_ha_forecast,
    rebase_idokep_timeline,
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


def test_rainy_conditions_without_precipitation_do_not_skip() -> None:
    decision = evaluate_green_lawn(
        forecast(precipitation=0, probability=90, rainy_hours=6),
        "Időkép",
        NOW,
    )

    assert decision.factor > 0
    assert decision.precipitation_mm == 0


def test_green_lawn_increases_hot_sunny_day() -> None:
    decision = evaluate_green_lawn(
        forecast(temperature=33, cloud_cover=5),
        "Időkép",
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


def test_calendar_day_decision_is_identical_for_every_program_time() -> None:
    hours = forecast(temperature=32, precipitation=3, probability=75)
    early = evaluate_calendar_day(hours, "Időkép", NOW)
    later = evaluate_calendar_day(
        hours,
        "Időkép",
        NOW + timedelta(hours=12),
    )

    assert early.as_dict() == later.as_dict()


def test_calendar_day_uses_only_the_target_days_available_hours() -> None:
    late_now = datetime(2026, 7, 1, 18, 0, tzinfo=UTC)
    hours = [
        ForecastHour(
            timestamp=late_now + timedelta(hours=index + 1),
            temperature=36 if index == 1 else 28,
            precipitation_mm=8 if index == 8 else 0,
            precipitation_probability=90 if index == 8 else 0,
            condition="rainy" if index == 8 else "sunny",
            cloud_cover=10,
            is_daylight=index < 2,
        )
        for index in range(24)
    ]

    decision = evaluate_calendar_day(
        hours,
        "Időkép",
        late_now + timedelta(hours=2),
    )

    assert decision.max_temperature == 36
    assert decision.precipitation_mm == 0
    assert decision.factor > 0
    assert decision.source == "Időkép"


def test_calendar_day_requires_at_least_one_hour_for_that_date() -> None:
    with pytest.raises(WeatherUnavailableError, match="erre a napra"):
        evaluate_calendar_day(
            forecast(),
            "Időkép",
            NOW + timedelta(days=3),
        )


def test_idokep_timeline_rebuilds_today_after_hidden_past_hours() -> None:
    local_now = datetime(2026, 7, 1, 6, 9, tzinfo=UTC)
    raw = [
        ForecastHour(
            timestamp=datetime(2026, 7, 2, hour, tzinfo=UTC),
            temperature=20 + hour,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="sunny",
        )
        for hour in range(24)
    ] + [
        ForecastHour(
            timestamp=datetime(2026, 7, 3, hour, tzinfo=UTC),
            temperature=18,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="cloudy",
        )
        for hour in range(6)
    ]

    rebased = rebase_idokep_timeline(raw, local_now)

    assert rebased[0].timestamp.isoformat() == "2026-07-01T06:00:00+00:00"
    assert rebased[17].timestamp.isoformat() == "2026-07-01T23:00:00+00:00"
    assert rebased[18].timestamp.isoformat() == "2026-07-02T00:00:00+00:00"


def test_idokep_timeline_keeps_normal_current_hour_sequence() -> None:
    local_now = datetime(2026, 7, 1, 6, 9, tzinfo=UTC)
    raw = [
        ForecastHour(
            timestamp=local_now.replace(hour=hour, minute=0),
            temperature=25,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="sunny",
        )
        for hour in range(7, 24)
    ] + [
        ForecastHour(
            timestamp=datetime(2026, 7, 2, hour, tzinfo=UTC),
            temperature=20,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="cloudy",
        )
        for hour in range(6)
    ]

    rebased = rebase_idokep_timeline(raw, local_now)

    assert rebased[0].timestamp.isoformat() == "2026-07-01T07:00:00+00:00"
    assert rebased[-1].timestamp.isoformat() == "2026-07-02T05:00:00+00:00"


def test_idokep_implausible_temperature_is_rejected() -> None:
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
