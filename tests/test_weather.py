"""Tests for weather normalization and the green-lawn algorithm."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from custom_components.smart_yardian.evapotranspiration import (
    extraterrestrial_radiation_mj_m2_day,
)
from custom_components.smart_yardian.models import ForecastHour
from custom_components.smart_yardian.weather import (
    WeatherUnavailableError,
    assess_program_wind,
    evaluate_calendar_day,
    evaluate_green_lawn,
    find_wind_delay,
    forecast_day_max_temperature,
    is_plausible_celsius,
    merge_hourly_forecast_snapshots,
    normalize_ha_forecast,
    rebase_idokep_timeline,
    validate_idokep_location,
)

NOW = datetime(2026, 7, 1, 4, 0, tzinfo=UTC)


def test_budapest_summer_extraterrestrial_radiation_is_realistic() -> None:
    radiation = extraterrestrial_radiation_mj_m2_day(47.5, 182)

    assert 40 < radiation < 42


def forecast(
    *,
    precipitation: float = 0,
    probability: float = 0,
    temperature: float = 29,
    cloud_cover: float = 30,
    rainy_hours: int = 0,
    wind_speed: float | None = 12,
    wind_gust: float | None = 20,
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
            wind_speed_kmh=wind_speed,
            wind_gust_kmh=wind_gust,
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


def test_measured_rain_is_separate_but_counts_toward_skip() -> None:
    decision = evaluate_green_lawn(
        forecast(precipitation=1.5, probability=40),
        "Időkép",
        NOW,
        observed_precipitation_mm=7,
        rain_station="Csömör (csomor1)",
    )

    assert decision.factor == 0
    assert decision.precipitation_mm == 1.5
    assert decision.observed_precipitation_mm == 7
    assert decision.effective_precipitation_mm == 8.5
    assert decision.rain_station == "Csömör (csomor1)"
    assert "mért és a várható" in decision.reason


def test_measured_rain_alone_can_reduce_irrigation() -> None:
    dry = evaluate_green_lawn(
        forecast(temperature=22, cloud_cover=70),
        "Időkép",
        NOW,
    )
    decision = evaluate_green_lawn(
        forecast(temperature=22, cloud_cover=70),
        "Időkép",
        NOW,
        observed_precipitation_mm=2.5,
    )

    assert decision.factor < dry.factor
    assert decision.rain_factor == 0.85
    assert decision.precipitation_mm == 0
    assert decision.observed_precipitation_mm == 2.5


def test_rainy_conditions_without_precipitation_do_not_skip() -> None:
    decision = evaluate_green_lawn(
        forecast(precipitation=0, probability=90, rainy_hours=6),
        "Időkép",
        NOW,
    )

    assert decision.factor > 0
    assert decision.precipitation_mm == 0


def test_green_lawn_increases_hot_sunny_day() -> None:
    hours = forecast(temperature=24, cloud_cover=5)
    temperatures = [
        22, 22, 23, 24, 26, 28, 31, 33, 35, 35, 34, 33,
        31, 29, 27, 25, 24, 23, 22, 22, 22, 22, 22, 22,
    ]
    for hour, temperature in zip(hours, temperatures, strict=True):
        hour.temperature = temperature
    decision = evaluate_green_lawn(hours, "Időkép", NOW)
    assert decision.factor > 1
    assert decision.rain_factor == 1
    assert decision.adjusted_et0_mm is not None
    assert decision.adjusted_et0_mm > decision.et_reference_mm
    assert decision.irrigation_target_mm == pytest.approx(
        decision.adjusted_et0_mm * 0.85,
        abs=0.02,
    )
    assert decision.sunny_hours >= 8
    assert "párolgás" in decision.reason


def test_weather_decision_includes_daily_wind_stats() -> None:
    hours = forecast(wind_speed=18, wind_gust=28)
    hours[2].wind_speed_kmh = 37
    hours[2].wind_gust_kmh = 51

    decision = evaluate_green_lawn(hours, "Időkép", NOW)

    assert decision.max_wind_speed_kmh == 37
    assert decision.max_wind_gust_kmh == 51
    assert decision.windy_hours == 1


def test_green_lawn_reduces_for_light_rain() -> None:
    dry = evaluate_green_lawn(
        forecast(temperature=22, cloud_cover=70),
        "Időkép",
        NOW,
    )
    decision = evaluate_green_lawn(
        forecast(precipitation=2.4, probability=45, temperature=22, cloud_cover=70),
        "Időkép",
        NOW,
    )
    assert decision.factor < dry.factor
    assert decision.rain_factor == 0.85


def test_cloud_and_wind_adjust_hargreaves_et_with_safe_limits() -> None:
    sunny = forecast(temperature=26, cloud_cover=5, wind_speed=5)
    cloudy = forecast(temperature=26, cloud_cover=95, wind_speed=5)
    windy = forecast(temperature=26, cloud_cover=5, wind_speed=80)
    for hours in (sunny, cloudy, windy):
        for index, hour in enumerate(hours):
            hour.temperature = 20 + min(index, 12)

    sunny_decision = evaluate_green_lawn(sunny, "Időkép", NOW)
    cloudy_decision = evaluate_green_lawn(cloudy, "Időkép", NOW)
    windy_decision = evaluate_green_lawn(windy, "Időkép", NOW)

    assert sunny_decision.et0_mm == cloudy_decision.et0_mm
    assert sunny_decision.adjusted_et0_mm > cloudy_decision.adjusted_et0_mm
    assert windy_decision.adjusted_et0_mm > sunny_decision.adjusted_et0_mm
    assert windy_decision.et_wind_factor == 1.15
    assert 0.75 <= cloudy_decision.et_cloud_factor <= 1.1


def test_et_can_be_disabled_to_use_legacy_temperature_bands() -> None:
    decision = evaluate_green_lawn(
        forecast(temperature=33, cloud_cover=5),
        "Időkép",
        NOW,
        settings={"evapotranspiration_enabled": False},
    )

    assert decision.factor == 1.35
    assert decision.irrigation_target_mm is None
    assert decision.et0_mm is not None


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


def test_idokep_timeline_keeps_next_midnight_at_2302_in_budapest() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    local_now = datetime(2026, 7, 1, 23, 2, tzinfo=timezone)
    raw = [
        ForecastHour(
            timestamp=datetime(2026, 7, 2, hour, tzinfo=timezone),
            temperature=24,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="clear-night",
            wind_speed_kmh=18,
        )
        for hour in range(3)
    ]

    rebased = rebase_idokep_timeline(raw, local_now)

    assert [hour.timestamp.isoformat() for hour in rebased] == [
        "2026-07-02T00:00:00+02:00",
        "2026-07-02T01:00:00+02:00",
        "2026-07-02T02:00:00+02:00",
    ]


@pytest.mark.parametrize("current_hour", [22, 23])
def test_idokep_timeline_rotates_malformed_full_day_across_midnight(
    current_hour: int,
) -> None:
    timezone = ZoneInfo("Europe/Budapest")
    local_now = datetime(2026, 7, 1, current_hour, 2, tzinfo=timezone)
    raw = [
        ForecastHour(
            timestamp=datetime(2026, 7, 2, hour, tzinfo=timezone),
            temperature=20 + hour,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="sunny",
            wind_speed_kmh=15,
        )
        for hour in range(24)
    ]

    rebased = rebase_idokep_timeline(raw, local_now)

    expected_hours = list(range(current_hour, 24)) + list(range(current_hour))
    assert [hour.timestamp.hour for hour in rebased] == expected_hours
    assert rebased[0].timestamp.date() == local_now.date()
    midnight_index = 24 - current_hour
    assert rebased[midnight_index].timestamp == datetime(
        2026,
        7,
        2,
        0,
        tzinfo=timezone,
    )


def test_forecast_snapshot_keeps_current_hour_after_provider_rolls_it_off() -> None:
    scheduled_at = datetime(2026, 7, 1, 19, 0, tzinfo=UTC)
    cached = [
        ForecastHour(
            timestamp=scheduled_at,
            temperature=28,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="sunny",
            wind_speed_kmh=38,
            wind_gust_kmh=52,
        )
    ]
    fresh = [
        ForecastHour(
            timestamp=scheduled_at + timedelta(hours=1),
            temperature=27,
            precipitation_mm=0,
            precipitation_probability=0,
            condition="sunny",
            wind_speed_kmh=12,
            wind_gust_kmh=20,
        )
    ]

    merged = merge_hourly_forecast_snapshots(
        cached,
        fresh,
        scheduled_at + timedelta(minutes=2),
    )
    assessment = assess_program_wind(
        merged,
        scheduled_at,
        60,
        ["rotator"],
    )

    assert [hour.timestamp.hour for hour in merged] == [19, 20]
    assert assessment.action == "delay"
    assert assessment.max_wind_speed_kmh == 38


def test_forecast_snapshot_drops_an_hour_after_its_window_has_ended() -> None:
    cached_hour = ForecastHour(
        timestamp=datetime(2026, 7, 1, 19, 0, tzinfo=UTC),
        temperature=28,
        precipitation_mm=0,
        precipitation_probability=0,
        condition="sunny",
        wind_speed_kmh=38,
    )

    merged = merge_hourly_forecast_snapshots(
        [cached_hour],
        [],
        datetime(2026, 7, 1, 20, 0, tzinfo=UTC),
    )

    assert merged == []


def test_forecast_snapshot_drops_absent_future_hours() -> None:
    future_hour = ForecastHour(
        timestamp=datetime(2026, 7, 2, 19, 0, tzinfo=UTC),
        temperature=28,
        precipitation_mm=0,
        precipitation_probability=0,
        condition="sunny",
        wind_speed_kmh=38,
    )

    merged = merge_hourly_forecast_snapshots(
        [future_hour],
        [],
        datetime(2026, 7, 1, 19, 2, tzinfo=UTC),
    )

    assert merged == []


def test_forecast_snapshot_keeps_cached_wind_when_fresh_hour_omits_it() -> None:
    timestamp = datetime(2026, 7, 1, 19, 0, tzinfo=UTC)
    cached_hour = ForecastHour(
        timestamp=timestamp,
        temperature=27,
        precipitation_mm=0,
        precipitation_probability=0,
        condition="partlycloudy",
        wind_speed_kmh=35,
        wind_gust_kmh=49,
        wind_bearing_deg=225,
    )
    fresh_hour = ForecastHour(
        timestamp=timestamp,
        temperature=28,
        precipitation_mm=0,
        precipitation_probability=0,
        condition="sunny",
    )

    merged = merge_hourly_forecast_snapshots(
        [cached_hour],
        [fresh_hour],
        timestamp + timedelta(minutes=2),
    )

    assert merged[0].temperature == 28
    assert merged[0].condition == "sunny"
    assert merged[0].wind_speed_kmh == 35
    assert merged[0].wind_gust_kmh == 49
    assert merged[0].wind_bearing_deg == 225


def test_forecast_snapshot_distinguishes_repeated_dst_hour() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    first_0200 = ForecastHour(
        timestamp=datetime(2026, 10, 25, 2, 0, tzinfo=timezone, fold=0),
        temperature=12,
        precipitation_mm=0,
        precipitation_probability=0,
        condition="cloudy",
        wind_speed_kmh=38,
    )
    second_0200 = replace(
        first_0200,
        timestamp=datetime(2026, 10, 25, 2, 0, tzinfo=timezone, fold=1),
        wind_speed_kmh=12,
    )

    merged = merge_hourly_forecast_snapshots(
        [first_0200, second_0200],
        [],
        datetime(2026, 10, 25, 2, 30, tzinfo=timezone, fold=1),
    )

    assert merged == [second_0200]


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


def test_idokep_wind_fields_are_normalized() -> None:
    forecast = normalize_ha_forecast(
        [
            {
                "datetime": NOW.isoformat(),
                "temperature": 24,
                "condition": "sunny",
                "precipitation": 0,
                "precipitation_probability": 0,
                "wind_speed": 32,
                "wind_gust": 47,
                "wind_bearing": 370,
            }
        ]
    )

    assert forecast[0].wind_speed_kmh == 32
    assert forecast[0].wind_gust_kmh == 47
    assert forecast[0].wind_bearing_deg == 10


def test_home_assistant_native_wind_fields_are_normalized() -> None:
    forecast = normalize_ha_forecast(
        [
            {
                "datetime": NOW.isoformat(),
                "temperature": 24,
                "condition": "sunny",
                "precipitation": 0,
                "precipitation_probability": 0,
                "native_wind_speed": 25,
                "native_wind_gust_speed": 40,
                "wind_bearing_deg": 180,
            }
        ]
    )

    assert forecast[0].wind_speed_kmh == 25
    assert forecast[0].wind_gust_kmh == 40
    assert forecast[0].wind_bearing_deg == 180


def test_wind_delay_selects_later_same_day_window() -> None:
    hours = forecast(wind_speed=12, wind_gust=20)
    hours[0].wind_speed_kmh = 36
    hours[0].wind_gust_kmh = 52

    assessment = find_wind_delay(
        hours,
        NOW + timedelta(hours=1),
        60,
        ["rotator"],
        {"wind_delay_step_minutes": 30, "wind_delay_until": "08:00"},
    )

    assert assessment.action == "delay"
    assert assessment.delayed_until == NOW + timedelta(hours=2)
    assert "06:00" in assessment.reason


def test_wind_skip_when_no_later_safe_window() -> None:
    hours = forecast(wind_speed=36, wind_gust=52)

    assessment = find_wind_delay(
        hours,
        NOW + timedelta(hours=1),
        60,
        ["rotator"],
        {"wind_delay_step_minutes": 30, "wind_delay_until": "07:00"},
    )

    assert assessment.action == "skip"
    assert "nincs elég" in assessment.reason


def test_drip_zone_ignores_wind() -> None:
    assessment = assess_program_wind(
        forecast(wind_speed=80, wind_gust=100),
        NOW + timedelta(hours=1),
        60,
        ["drip"],
    )

    assert assessment.action == "none"


def test_missing_wind_data_warns_but_allows_automatic_overhead_window() -> None:
    assessment = assess_program_wind(
        forecast(wind_speed=None, wind_gust=None),
        NOW + timedelta(hours=1),
        60,
        ["spray"],
    )

    assert assessment.action == "warn"
    assert "Nincs széladat" in assessment.reason
    assert "lefut" in assessment.reason


def test_missing_wind_data_does_not_create_a_delay_or_skip() -> None:
    assessment = find_wind_delay(
        forecast(wind_speed=None, wind_gust=None),
        NOW + timedelta(hours=1),
        60,
        ["spray"],
    )

    assert assessment.action == "warn"
    assert assessment.delayed_until is None


def test_idokep_location_accepts_hungarian_settlement_names() -> None:
    assert validate_idokep_location("  Székesfehérvár  ") == "Székesfehérvár"
    assert validate_idokep_location("Budapest XIII. kerület") == (
        "Budapest XIII. kerület"
    )


@pytest.mark.parametrize("value", ["", "B", "https://example.com", "../Pécs"])
def test_idokep_location_rejects_unsafe_values(value: str) -> None:
    with pytest.raises(ValueError):
        validate_idokep_location(value)


def test_temperature_plausibility_guard() -> None:
    assert is_plausible_celsius(36.9)
    assert not is_plausible_celsius(297.8)
