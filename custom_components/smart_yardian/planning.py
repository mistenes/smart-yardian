"""Pure helpers for upcoming irrigation schedule planning."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from .models import IrrigationProgram


@dataclass(frozen=True, slots=True)
class ProgramOccurrence:
    """One future scheduled program occurrence."""

    program: IrrigationProgram
    scheduled_at: datetime


def upcoming_occurrences(
    programs: Iterable[IrrigationProgram],
    now: datetime,
    days: int = 3,
) -> list[ProgramOccurrence]:
    """Return enabled occurrences from now through the requested calendar days."""
    occurrences: list[ProgramOccurrence] = []
    for offset in range(days):
        date = (now + timedelta(days=offset)).date()
        for program in programs:
            if not program.enabled or date.weekday() not in program.weekdays:
                continue
            hour, minute = (int(part) for part in program.start_time.split(":"))
            scheduled_at = datetime.combine(
                date,
                time(hour=hour, minute=minute),
                tzinfo=now.tzinfo,
            )
            if scheduled_at > now:
                occurrences.append(ProgramOccurrence(program, scheduled_at))
    return sorted(occurrences, key=lambda item: item.scheduled_at)
