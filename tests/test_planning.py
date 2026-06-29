"""Tests for the three-day program occurrence planner."""

from datetime import UTC, datetime

from custom_components.smart_yardian.models import IrrigationProgram
from custom_components.smart_yardian.planning import upcoming_occurrences


def program(
    program_id: str,
    weekdays: list[int],
    start_time: str,
    enabled: bool = True,
) -> IrrigationProgram:
    return IrrigationProgram.from_dict(
        {
            "program_id": program_id,
            "name": program_id,
            "weekdays": weekdays,
            "start_time": start_time,
            "enabled": enabled,
            "zones": [{"entity_id": "switch.gyep", "duration_minutes": 10}],
        }
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
