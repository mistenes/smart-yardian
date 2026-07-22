"""Tests for fixed and intelligent irrigation planning."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from custom_components.smart_yardian.models import ForecastHour, IrrigationProgram
from custom_components.smart_yardian.planning import (
    select_smart_watering_slot,
    smart_window_bounds,
    upcoming_occurrences,
)


def program(
    program_id: str,
    weekdays: list[int],
    start_time: str,
    enabled: bool = True,
    *,
    schedule_mode: str = "fixed",
    window_start_time: str | None = None,
    window_end_time: str | None = None,
) -> IrrigationProgram:
    return IrrigationProgram.from_dict(
        {
            "program_id": program_id,
            "name": program_id,
            "weekdays": weekdays,
            "start_time": start_time,
            "enabled": enabled,
            "schedule_mode": schedule_mode,
            "window_start_time": window_start_time,
            "window_end_time": window_end_time,
            "zones": [{"entity_id": "switch.gyep", "duration_minutes": 10}],
        }
    )


def forecast_hour(
    timestamp: datetime,
    *,
    precipitation_mm: float = 0,
    probability: float = 0,
    temperature: float = 20,
    daylight: bool = False,
    wind_speed: float | None = 10,
    wind_gust: float | None = 15,
    humidity: float | None = None,
    condition: str = "clear-night",
) -> ForecastHour:
    return ForecastHour(
        timestamp=timestamp,
        temperature=temperature,
        precipitation_mm=precipitation_mm,
        precipitation_probability=probability,
        condition=condition,
        is_daylight=daylight,
        wind_speed_kmh=wind_speed,
        wind_gust_kmh=wind_gust,
        humidity_percent=humidity,
    )


def test_upcoming_occurrences_cover_three_calendar_days() -> None:
    now = datetime(2026, 6, 29, 12, 0, tzinfo=UTC)  # Monday
    occurrences = upcoming_occurrences(
        [
            program("daily", list(range(7)), "20:00"),
            program("morning", list(range(7)), "05:00"),
            program("disabled", list(range(7)), "21:00", enabled=False),
        ],
        now,
    )

    assert [item.program.program_id for item in occurrences] == [
        "daily",
        "morning",
        "daily",
        "morning",
        "daily",
    ]
    assert occurrences[0].scheduled_at.isoformat() == "2026-06-29T20:00:00+00:00"
    assert occurrences[-1].scheduled_at.isoformat() == "2026-07-01T20:00:00+00:00"


def test_upcoming_occurrences_respect_weekdays() -> None:
    now = datetime(2026, 6, 29, 0, 0, tzinfo=UTC)  # Monday
    occurrences = upcoming_occurrences(
        [program("wednesday", [2], "06:30")],
        now,
    )
    assert len(occurrences) == 1
    assert occurrences[0].scheduled_at.weekday() == 2


def test_upcoming_occurrences_include_next_midnight_from_2302() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    now = datetime(2026, 7, 1, 23, 1, tzinfo=timezone)

    occurrences = upcoming_occurrences(
        [program("midnight", list(range(7)), "00:00")],
        now,
        days=2,
    )

    assert occurrences[0].scheduled_at == datetime(
        2026,
        7,
        2,
        0,
        0,
        tzinfo=timezone,
    )


def test_smart_occurrence_exposes_same_day_window_bounds() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    now = datetime(2026, 6, 29, 1, 0, tzinfo=timezone)  # Monday

    occurrences = upcoming_occurrences(
        [
            program(
                "smart",
                [0],
                "03:00",
                schedule_mode="smart_window",
                window_start_time="03:00",
                window_end_time="07:00",
            )
        ],
        now,
    )

    occurrence = occurrences[0]
    assert occurrence.scheduled_at == datetime(2026, 6, 29, 3, 0, tzinfo=timezone)
    assert occurrence.window_start_at == occurrence.scheduled_at
    assert occurrence.window_end_at == datetime(2026, 6, 29, 7, 0, tzinfo=timezone)
    assert occurrence.service_date.isoformat() == "2026-06-29"


def test_smart_overnight_window_uses_opening_weekday_and_next_day_end() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    now = datetime(2026, 6, 29, 20, 0, tzinfo=timezone)  # Monday

    occurrences = upcoming_occurrences(
        [
            program(
                "overnight",
                [0],
                "22:00",
                schedule_mode="smart_window",
                window_start_time="22:00",
                window_end_time="06:00",
            )
        ],
        now,
    )

    occurrence = occurrences[0]
    assert occurrence.service_date.weekday() == 0
    assert occurrence.scheduled_at == datetime(2026, 6, 29, 22, 0, tzinfo=timezone)
    assert occurrence.window_end_at == datetime(2026, 6, 30, 6, 0, tzinfo=timezone)


def test_smart_overnight_window_remains_active_after_midnight() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    now = datetime(2026, 6, 30, 2, 0, tzinfo=timezone)  # Tuesday

    occurrences = upcoming_occurrences(
        [
            program(
                "monday-overnight",
                [0],
                "22:00",
                schedule_mode="smart_window",
                window_start_time="22:00",
                window_end_time="06:00",
            )
        ],
        now,
    )

    assert len(occurrences) == 1
    assert occurrences[0].service_date.isoformat() == "2026-06-29"
    assert occurrences[0].scheduled_at == datetime(2026, 6, 29, 22, 0, tzinfo=timezone)
    assert occurrences[0].window_end_at == datetime(2026, 6, 30, 6, 0, tzinfo=timezone)


def test_smart_window_bounds_follow_real_elapsed_time_across_dst_jump() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    now = datetime(2026, 3, 28, 23, 0, tzinfo=timezone)
    occurrences = upcoming_occurrences(
        [
            program(
                "dst-window",
                [6],
                "01:30",
                schedule_mode="smart_window",
                window_start_time="01:30",
                window_end_time="04:30",
            )
        ],
        now,
        days=2,
    )

    occurrence = occurrences[0]
    assert occurrence.window_start_at.isoformat() == "2026-03-29T01:30:00+01:00"
    assert occurrence.window_end_at.isoformat() == "2026-03-29T04:30:00+02:00"
    assert (
        occurrence.window_end_at.astimezone(UTC) - occurrence.window_start_at.astimezone(UTC)
    ) == timedelta(hours=2)


def test_nonexistent_dst_window_returns_structured_no_fit() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    spring_forward = datetime(2026, 3, 29, 0, 0, tzinfo=timezone).date()
    dst_program = program(
        "dst-gap",
        [6],
        "02:30",
        schedule_mode="smart_window",
        window_start_time="02:30",
        window_end_time="03:00",
    )

    window_start, window_end = smart_window_bounds(
        dst_program,
        spring_forward,
        timezone,
    )
    choice = select_smart_watering_slot(
        [],
        window_start,
        window_end,
        15,
        ["rotator"],
    )

    assert window_start == window_end
    assert choice.status == "no_fit"
    assert choice.scheduled_at is None
    assert choice.window_start_at == window_start
    assert choice.window_end_at == window_end
    assert "óraátállítás" in choice.reason


def test_smart_occurrence_remains_visible_after_window_opened() -> None:
    now = datetime(2026, 6, 29, 4, 0, tzinfo=UTC)  # Monday
    occurrences = upcoming_occurrences(
        [
            program(
                "active-window",
                [0],
                "03:00",
                schedule_mode="smart_window",
                window_start_time="03:00",
                window_end_time="07:00",
            )
        ],
        now,
    )

    assert len(occurrences) == 1
    assert occurrences[0].scheduled_at == datetime(2026, 6, 29, 3, 0, tzinfo=UTC)


def test_smart_selector_rejects_strong_wind_and_chooses_later_safe_slot() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    hours = [
        forecast_hour(start, wind_speed=40, wind_gust=55),
        forecast_hour(start + timedelta(hours=1), wind_speed=12, wind_gust=18),
        forecast_hour(start + timedelta(hours=2), wind_speed=15, wind_gust=20),
    ]

    choice = select_smart_watering_slot(
        hours,
        start,
        start + timedelta(hours=3),
        45,
        ["rotator"],
    )

    assert choice.status == "planned"
    assert choice.scheduled_at == start + timedelta(hours=1)
    assert choice.planned_end_at == start + timedelta(hours=1, minutes=45)
    assert choice.wind_action == "none"


def test_smart_selector_allows_missing_wind_with_penalty() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    choice = select_smart_watering_slot(
        [forecast_hour(start, wind_speed=None, wind_gust=None)],
        start,
        start + timedelta(hours=1),
        30,
        ["rotator"],
    )

    assert choice.status == "planned"
    assert choice.scheduled_at == start
    assert choice.wind_action == "warn"
    assert choice.score is not None
    assert choice.score[3] == 1


def test_smart_selector_prefers_known_wind_over_missing_wind() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    hours = [
        forecast_hour(start, wind_speed=None, wind_gust=None),
        forecast_hour(start + timedelta(hours=1), wind_speed=12, wind_gust=18),
    ]

    choice = select_smart_watering_slot(
        hours,
        start,
        start + timedelta(hours=2),
        45,
        ["rotator"],
    )

    assert choice.scheduled_at == start + timedelta(hours=1)
    assert choice.score is not None
    assert choice.score[3] == 0


def test_smart_selector_ranks_dry_dark_cool_slot_before_earlier_candidate() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    hours = [
        forecast_hour(start, precipitation_mm=0.4, probability=70),
        forecast_hour(
            start + timedelta(hours=1),
            probability=10,
            temperature=18,
            daylight=False,
        ),
        forecast_hour(
            start + timedelta(hours=2),
            probability=10,
            temperature=24,
            daylight=True,
            condition="sunny",
        ),
    ]

    choice = select_smart_watering_slot(
        hours,
        start,
        start + timedelta(hours=3),
        45,
        ["rotator"],
    )

    assert choice.scheduled_at == start + timedelta(hours=1)
    assert choice.precipitation_mm == 0
    assert choice.daylight_fraction == 0
    assert choice.average_temperature == 18


def test_smart_selector_prefers_more_humid_equivalent_slot() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    hours = [
        forecast_hour(start, humidity=35),
        forecast_hour(start + timedelta(hours=1), humidity=85),
    ]

    choice = select_smart_watering_slot(
        hours,
        start,
        start + timedelta(hours=2),
        45,
        ["rotator"],
    )

    assert choice.scheduled_at == start + timedelta(hours=1)
    assert choice.average_humidity_percent == 85
    assert "85% páratartalommal" in choice.reason


def test_smart_selector_requires_whole_duration_to_fit() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    choice = select_smart_watering_slot(
        [forecast_hour(start), forecast_hour(start + timedelta(hours=1))],
        start,
        start + timedelta(hours=1),
        75,
        ["rotator"],
    )

    assert choice.status == "no_fit"
    assert choice.scheduled_at is None


def test_transition_buffer_reserves_window_without_extending_irrigation() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    choice = select_smart_watering_slot(
        [forecast_hour(start)],
        start,
        start + timedelta(hours=1),
        45,
        ["rotator"],
        transition_buffer_minutes=15,
    )

    assert choice.status == "planned"
    assert choice.scheduled_at == start
    assert choice.duration_minutes == 45
    assert choice.transition_buffer_minutes == 15
    assert choice.scheduled_at + timedelta(minutes=45) < choice.planned_end_at
    assert choice.planned_end_at == start + timedelta(hours=1)


def test_partially_missing_wind_is_allowed_with_penalty() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    choice = select_smart_watering_slot(
        [
            forecast_hour(start, wind_speed=8, wind_gust=12),
            forecast_hour(
                start + timedelta(hours=1),
                wind_speed=None,
                wind_gust=None,
            ),
        ],
        start,
        start + timedelta(hours=2),
        90,
        ["rotator"],
    )

    assert choice.status == "planned"
    assert choice.wind_action == "warn"
    assert choice.wind_reason is not None
    assert "büntetőpontot" in choice.wind_reason
    assert choice.score is not None
    assert choice.score[3] == 1


def test_overnight_selector_starts_at_next_candidate_after_midnight() -> None:
    timezone = ZoneInfo("Europe/Budapest")
    window_start = datetime(2026, 7, 19, 23, 0, tzinfo=timezone)
    window_end = datetime(2026, 7, 20, 2, 0, tzinfo=timezone)
    now = datetime(2026, 7, 20, 0, 10, tzinfo=timezone)
    choice = select_smart_watering_slot(
        [
            forecast_hour(datetime(2026, 7, 20, 0, 0, tzinfo=timezone)),
            forecast_hour(datetime(2026, 7, 20, 1, 0, tzinfo=timezone)),
        ],
        window_start,
        window_end,
        45,
        ["rotator"],
        now=now,
    )

    assert choice.status == "planned"
    assert choice.scheduled_at == datetime(2026, 7, 20, 0, 15, tzinfo=timezone)
    assert choice.planned_end_at == datetime(2026, 7, 20, 1, 0, tzinfo=timezone)


def test_smart_selector_reports_when_no_remaining_start_can_fit() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    choice = select_smart_watering_slot(
        [forecast_hour(start), forecast_hour(start + timedelta(hours=1))],
        start,
        start + timedelta(hours=2),
        45,
        ["rotator"],
        now=start + timedelta(hours=1, minutes=30),
    )

    assert choice.status == "no_candidate"
    assert "Már nincs" in choice.reason


def test_smart_selector_honours_blocked_intervals() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    choice = select_smart_watering_slot(
        [forecast_hour(start), forecast_hour(start + timedelta(hours=1))],
        start,
        start + timedelta(hours=2),
        45,
        ["rotator"],
        blocked_intervals=[(start, start + timedelta(hours=1))],
    )

    assert choice.status == "planned"
    assert choice.scheduled_at == start + timedelta(hours=1)


def test_smart_selector_reports_when_every_slot_is_too_windy() -> None:
    start = datetime(2026, 7, 1, 3, 0, tzinfo=UTC)
    choice = select_smart_watering_slot(
        [
            forecast_hour(start, wind_speed=40, wind_gust=55),
            forecast_hour(
                start + timedelta(hours=1),
                wind_speed=40,
                wind_gust=55,
            ),
        ],
        start,
        start + timedelta(hours=2),
        45,
        ["rotator"],
    )

    assert choice.status == "wind_blocked"
    assert choice.scheduled_at is None
