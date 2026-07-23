"""Regressions for retaining the forecast that an active smart window needs."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from custom_components.smart_yardian.models import ForecastHour
from custom_components.smart_yardian.planning import select_smart_watering_slot
from custom_components.smart_yardian.weather import (
    merge_hourly_forecast_cache,
    rebase_idokep_timeline,
)


def _hour(
    timestamp: datetime,
    *,
    temperature: float = 18,
    precipitation_mm: float = 0,
    probability: float = 0,
    condition: str = "clear-night",
    cloud_cover: float | None = 20,
    daylight: bool | None = False,
    wind_speed: float | None = 10,
    wind_gust: float | None = 15,
    wind_bearing: float | None = 180,
    humidity: float | None = 75,
) -> ForecastHour:
    return ForecastHour(
        timestamp=timestamp,
        temperature=temperature,
        precipitation_mm=precipitation_mm,
        precipitation_probability=probability,
        condition=condition,
        cloud_cover=cloud_cover,
        is_daylight=daylight,
        wind_speed_kmh=wind_speed,
        wind_gust_kmh=wind_gust,
        wind_bearing_deg=wind_bearing,
        humidity_percent=humidity,
    )


def test_cached_window_survives_provider_rolling_forward_to_0600() -> None:
    """The 02:45 plan must not disappear when fresh data begins at 06:00."""
    window_start = datetime(2026, 7, 23, 2, 0, tzinfo=UTC)
    now = window_start + timedelta(minutes=45)
    cached = [_hour(window_start + timedelta(hours=offset)) for offset in range(4)]
    last_seen = {hour.timestamp: window_start for hour in cached}
    fresh = [_hour(window_start + timedelta(hours=4), temperature=17)]

    merged, merged_last_seen = merge_hourly_forecast_cache(
        cached,
        fresh,
        now,
        previous_last_seen=last_seen,
        fetched_at=now,
    )

    assert [hour.timestamp.hour for hour in merged] == [2, 3, 4, 5, 6]
    assert merged_last_seen[fresh[0].timestamp] == now

    choice = select_smart_watering_slot(
        merged,
        window_start,
        window_start + timedelta(hours=4),
        181,
        ["rotator"],
        now=now,
        transition_buffer_minutes=14,
    )

    assert choice.status == "planned"
    assert choice.scheduled_at == now
    assert choice.planned_end_at == window_start + timedelta(hours=4)


def test_fresh_same_hour_replaces_every_available_cached_value() -> None:
    timestamp = datetime(2026, 7, 23, 3, 0, tzinfo=UTC)
    cached = _hour(
        timestamp,
        temperature=19,
        precipitation_mm=1.2,
        probability=70,
        condition="rainy",
        cloud_cover=95,
        daylight=False,
        wind_speed=31,
        wind_gust=45,
        wind_bearing=90,
        humidity=88,
    )
    fresh = _hour(
        timestamp,
        temperature=22,
        precipitation_mm=0,
        probability=10,
        condition="partlycloudy",
        cloud_cover=35,
        daylight=True,
        wind_speed=12,
        wind_gust=18,
        wind_bearing=225,
        humidity=61,
    )
    fetched_at = timestamp + timedelta(minutes=20)

    merged, last_seen = merge_hourly_forecast_cache(
        [cached],
        [fresh],
        fetched_at,
        previous_last_seen={timestamp: timestamp},
        fetched_at=fetched_at,
    )

    assert merged == [fresh]
    assert last_seen == {timestamp: fetched_at}


def test_later_slot_uses_still_valid_cached_0400_and_0500_hours() -> None:
    window_start = datetime(2026, 7, 23, 2, 0, tzinfo=UTC)
    now = window_start + timedelta(hours=2, minutes=30)
    cached = [_hour(window_start + timedelta(hours=offset)) for offset in range(4)]
    fresh = [_hour(window_start + timedelta(hours=4))]

    merged, _last_seen = merge_hourly_forecast_cache(
        cached,
        fresh,
        now,
        previous_last_seen={hour.timestamp: window_start for hour in cached},
        fetched_at=now,
    )

    assert [hour.timestamp.hour for hour in merged] == [4, 5, 6]
    choice = select_smart_watering_slot(
        merged,
        window_start,
        window_start + timedelta(hours=4),
        75,
        ["rotator"],
        now=now,
        transition_buffer_minutes=15,
    )

    assert choice.status == "planned"
    assert choice.scheduled_at == now
    assert choice.planned_end_at == window_start + timedelta(hours=4)


def test_cache_rejects_ended_hours_and_future_hours_not_seen_for_six_hours() -> None:
    now = datetime(2026, 7, 23, 4, 30, tzinfo=UTC)
    expired = _hour(now.replace(hour=3, minute=0))
    current = _hour(now.replace(hour=4, minute=0))
    future = _hour(now.replace(hour=5, minute=0))
    stale_future = _hour(now.replace(hour=6, minute=0))
    cached_at_0200 = now.replace(hour=2, minute=0)

    merged, last_seen = merge_hourly_forecast_cache(
        [expired, current, future, stale_future],
        [],
        now,
        previous_last_seen={
            expired.timestamp: cached_at_0200,
            current.timestamp: cached_at_0200,
            future.timestamp: cached_at_0200,
            stale_future.timestamp: now - timedelta(hours=6, seconds=1),
        },
        fetched_at=now,
    )

    assert merged == [current, future]
    assert set(last_seen) == {current.timestamp, future.timestamp}


def test_rebase_and_cache_keep_both_budapest_fallback_hours() -> None:
    """The two local 02:00 hours must remain separate UTC cache entries."""
    timezone = ZoneInfo("Europe/Budapest")
    now = datetime(2026, 10, 25, 1, 30, tzinfo=timezone)
    raw = [
        _hour(datetime(2026, 10, 25, utc_hour, tzinfo=UTC))
        for utc_hour in (0, 1, 2)
    ]

    rebased = rebase_idokep_timeline(raw, now)
    merged, last_seen = merge_hourly_forecast_cache(
        [],
        rebased,
        now,
        fetched_at=now,
    )

    repeated = [hour for hour in merged if hour.timestamp.hour == 2]
    assert len(repeated) == 2
    assert [hour.timestamp.fold for hour in repeated] == [0, 1]
    assert len({hour.timestamp.astimezone(UTC) for hour in repeated}) == 2
    assert len(last_seen) == 3
