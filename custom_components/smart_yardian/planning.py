"""Pure helpers for fixed and intelligent irrigation schedule planning."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, time, timedelta
from math import ceil
from statistics import fmean
from typing import Any

from .models import ForecastHour, IrrigationProgram
from .weather import assess_program_wind, wind_thresholds_for_head_types

SMART_SLOT_STEP_MINUTES = 15
RAINY_SLOT_CONDITIONS = {
    "rainy",
    "pouring",
    "lightning-rainy",
    "snowy-rainy",
    "hail",
}

SmartScore = tuple[int, float, float, int, float, float, float, float]
BlockedInterval = tuple[datetime, datetime]


@dataclass(frozen=True, slots=True)
class ProgramOccurrence:
    """One future fixed start or intelligent watering opportunity."""

    program: IrrigationProgram
    scheduled_at: datetime
    service_date: date | None = None
    window_start_at: datetime | None = None
    window_end_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class SmartSlotChoice:
    """Explainable result of selecting a start inside one watering window."""

    status: str
    reason: str
    window_start_at: datetime
    window_end_at: datetime
    duration_minutes: int
    transition_buffer_minutes: int = 0
    scheduled_at: datetime | None = None
    planned_end_at: datetime | None = None
    score: SmartScore | None = None
    precipitation_mm: float | None = None
    precipitation_probability: float | None = None
    average_temperature: float | None = None
    average_humidity_percent: float | None = None
    daylight_fraction: float | None = None
    wind_action: str | None = None
    wind_reason: str | None = None
    max_wind_speed_kmh: float | None = None
    max_wind_gust_kmh: float | None = None

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-safe planning result for runtime storage or previews."""
        data = asdict(self)
        for key in (
            "window_start_at",
            "window_end_at",
            "scheduled_at",
            "planned_end_at",
        ):
            value = data[key]
            data[key] = value.isoformat() if value is not None else None
        if self.score is not None:
            data["score"] = list(self.score)
        return data


def upcoming_occurrences(
    programs: Iterable[IrrigationProgram],
    now: datetime,
    days: int = 3,
) -> list[ProgramOccurrence]:
    """Return fixed starts and smart opportunities for upcoming opening days."""
    occurrences: list[ProgramOccurrence] = []
    program_values = tuple(programs)

    # An overnight Monday window is still actionable early Tuesday, while its
    # deduplication/service date must remain Monday.
    previous_service_date = (now - timedelta(days=1)).date()
    for program in program_values:
        if (
            not program.enabled
            or program.schedule_mode != "smart_window"
            or previous_service_date.weekday() not in program.weekdays
        ):
            continue
        window_start, window_end = smart_window_bounds(
            program,
            previous_service_date,
            now.tzinfo,
        )
        if window_start <= now < window_end:
            occurrences.append(
                ProgramOccurrence(
                    program,
                    window_start,
                    previous_service_date,
                    window_start,
                    window_end,
                )
            )

    for offset in range(max(0, days)):
        service_date = (now + timedelta(days=offset)).date()
        for program in program_values:
            if not program.enabled or service_date.weekday() not in program.weekdays:
                continue
            if program.schedule_mode == "smart_window":
                window_start, window_end = smart_window_bounds(
                    program,
                    service_date,
                    now.tzinfo,
                )
                if window_end > now:
                    occurrences.append(
                        ProgramOccurrence(
                            program,
                            window_start,
                            service_date,
                            window_start,
                            window_end,
                        )
                    )
                continue

            hour, minute = _clock_parts(program.start_time)
            scheduled_at = datetime.combine(
                service_date,
                time(hour=hour, minute=minute),
                tzinfo=now.tzinfo,
            )
            if scheduled_at > now:
                occurrences.append(
                    ProgramOccurrence(
                        program,
                        scheduled_at,
                        service_date,
                    )
                )
    return sorted(occurrences, key=lambda item: item.scheduled_at)


def smart_window_bounds(
    program: IrrigationProgram,
    service_date: date,
    timezone: Any,
) -> tuple[datetime, datetime]:
    """Build timezone-aware bounds; weekday semantics follow the opening date."""
    if (
        program.schedule_mode != "smart_window"
        or program.window_start_time is None
        or program.window_end_time is None
    ):
        raise ValueError("A programnak nincs intelligens öntözési időablaka.")
    start_hour, start_minute = _clock_parts(program.window_start_time)
    end_hour, end_minute = _clock_parts(program.window_end_time)
    opens = datetime.combine(
        service_date,
        time(start_hour, start_minute),
        tzinfo=timezone,
    )
    overnight = (end_hour, end_minute) <= (start_hour, start_minute)
    closes = datetime.combine(
        service_date + timedelta(days=1 if overnight else 0),
        time(end_hour, end_minute),
        tzinfo=timezone,
    )
    normalized_open = _normalize_local_time(opens)
    normalized_close = _normalize_local_time(closes)
    if _as_utc(normalized_close) <= _as_utc(normalized_open):
        normalized_close = normalized_open
    return normalized_open, normalized_close


def select_smart_watering_slot(
    forecast: Iterable[ForecastHour],
    window_start_at: datetime,
    window_end_at: datetime,
    duration_minutes: int,
    head_types: Iterable[str],
    settings: dict[str, Any] | None = None,
    *,
    now: datetime | None = None,
    blocked_intervals: Iterable[BlockedInterval] = (),
    step_minutes: int = SMART_SLOT_STEP_MINUTES,
    transition_buffer_minutes: int = 0,
) -> SmartSlotChoice:
    """Choose the most efficient safe 15-minute candidate in a hard window.

    Ranking is intentionally lexicographic and explainable: dry slots, known
    and lower wind, darkness, lower temperature, then the earlier start win.
    Missing wind is allowed with a penalty; wind above a configured head-type
    threshold is rejected.
    """
    if duration_minutes <= 0:
        raise ValueError("A tervezett időtartam legyen pozitív.")
    if transition_buffer_minutes < 0:
        raise ValueError("Az átmeneti időtartalék nem lehet negatív.")
    if window_end_at <= window_start_at:
        return SmartSlotChoice(
            status="no_fit",
            reason=(
                "Az öntözési ablak ezen a napon az óraátállítás miatt "
                "nem tartalmaz használható időtartamot."
            ),
            window_start_at=window_start_at,
            window_end_at=window_end_at,
            duration_minutes=duration_minutes,
            transition_buffer_minutes=transition_buffer_minutes,
        )
    if step_minutes != SMART_SLOT_STEP_MINUTES:
        raise ValueError("Az intelligens tervezés 15 perces lépést használ.")

    planned_window = SmartSlotChoice(
        status="no_candidate",
        reason="Az öntözési ablakban nincs választható kezdési időpont.",
        window_start_at=window_start_at,
        window_end_at=window_end_at,
        duration_minutes=duration_minutes,
        transition_buffer_minutes=transition_buffer_minutes,
    )
    reserved_minutes = duration_minutes + transition_buffer_minutes
    if _add_elapsed(window_start_at, timedelta(minutes=reserved_minutes)) > window_end_at:
        return SmartSlotChoice(
            status="no_fit",
            reason=(
                f"A {duration_minutes} perces program nem fér bele a megadott öntözési ablakba."
            ),
            window_start_at=window_start_at,
            window_end_at=window_end_at,
            duration_minutes=duration_minutes,
            transition_buffer_minutes=transition_buffer_minutes,
        )

    forecast_hours = sorted(forecast, key=_hour_timestamp)
    head_type_values = tuple(head_types)
    wind_thresholds = wind_thresholds_for_head_types(head_type_values, settings)
    blocked = tuple(blocked_intervals)
    earliest = max(window_start_at, now) if now is not None else window_start_at
    candidate = _first_candidate(window_start_at, earliest, step_minutes)
    candidates_with_forecast = 0
    wind_rejections = 0
    fit_candidates = 0
    unblocked_candidates = 0
    valid: list[tuple[SmartScore, datetime, SmartSlotChoice]] = []

    while True:
        irrigation_end = _add_elapsed(
            candidate,
            timedelta(minutes=duration_minutes),
        )
        planned_end = _add_elapsed(candidate, timedelta(minutes=reserved_minutes))
        if planned_end > window_end_at:
            break
        fit_candidates += 1
        if any(
            _intervals_overlap(candidate, planned_end, blocked_start, blocked_end)
            for blocked_start, blocked_end in blocked
        ):
            candidate = _add_elapsed(candidate, timedelta(minutes=step_minutes))
            continue
        unblocked_candidates += 1

        hours = _covered_slot_hours(forecast_hours, candidate, irrigation_end)
        if hours is None:
            candidate = _add_elapsed(candidate, timedelta(minutes=step_minutes))
            continue
        candidates_with_forecast += 1

        wind = assess_program_wind(
            forecast_hours,
            candidate,
            duration_minutes,
            head_type_values,
            settings,
        )
        if wind.action in {"delay", "skip"}:
            wind_rejections += 1
            candidate = _add_elapsed(candidate, timedelta(minutes=step_minutes))
            continue

        precipitation = round(sum(hour.precipitation_mm for hour in hours), 3)
        probability = round(
            max(hour.precipitation_probability for hour in hours),
            1,
        )
        rainy = precipitation > 0 or any(_rainy_condition(hour.condition) for hour in hours)
        wind_missing = int(
            wind_thresholds is not None
            and any(hour.wind_speed_kmh is None and hour.wind_gust_kmh is None for hour in hours)
        )
        effective_wind_action = "warn" if wind_missing else wind.action
        effective_wind_reason = (
            "Az időablak egy részéhez nincs széladat; a jelölt büntetőpontot kap."
            if wind_missing and wind.action != "warn"
            else wind.reason
        )
        wind_utilization = _wind_utilization(
            wind.max_wind_speed_kmh,
            wind.max_wind_gust_kmh,
            wind_thresholds,
        )
        daylight_fraction = round(
            fmean(_daylight_value(hour) for hour in hours),
            3,
        )
        average_temperature = round(
            fmean(float(hour.temperature) for hour in hours),
            2,
        )
        humidity_values = [
            float(hour.humidity_percent)
            for hour in hours
            if hour.humidity_percent is not None
        ]
        average_humidity = (
            round(fmean(humidity_values), 1) if humidity_values else None
        )
        # Unknown humidity is neutral (60%).  Among otherwise equivalent
        # candidates, more humid air reduces spray evaporation and wins.
        humidity_penalty = round(
            100.0 - (average_humidity if average_humidity is not None else 60.0),
            1,
        )
        score: SmartScore = (
            int(rainy),
            precipitation,
            probability,
            wind_missing,
            round(wind_utilization, 4),
            daylight_fraction,
            average_temperature,
            humidity_penalty,
        )
        choice = SmartSlotChoice(
            status="planned",
            reason=_selection_reason(
                candidate,
                duration_minutes,
                rainy,
                precipitation,
                probability,
                effective_wind_action,
                wind.max_wind_speed_kmh,
                daylight_fraction,
                average_temperature,
                average_humidity,
                transition_buffer_minutes,
            ),
            window_start_at=window_start_at,
            window_end_at=window_end_at,
            duration_minutes=duration_minutes,
            transition_buffer_minutes=transition_buffer_minutes,
            scheduled_at=candidate,
            planned_end_at=planned_end,
            score=score,
            precipitation_mm=precipitation,
            precipitation_probability=probability,
            average_temperature=average_temperature,
            average_humidity_percent=average_humidity,
            daylight_fraction=daylight_fraction,
            wind_action=effective_wind_action,
            wind_reason=effective_wind_reason,
            max_wind_speed_kmh=wind.max_wind_speed_kmh,
            max_wind_gust_kmh=wind.max_wind_gust_kmh,
        )
        valid.append((score, candidate, choice))
        candidate = _add_elapsed(candidate, timedelta(minutes=step_minutes))

    if valid:
        return min(valid, key=lambda item: (item[0], item[1]))[2]
    if fit_candidates == 0:
        return SmartSlotChoice(
            status="no_candidate",
            reason="Már nincs olyan kezdési időpont, amely befér az időablakba.",
            window_start_at=window_start_at,
            window_end_at=window_end_at,
            duration_minutes=duration_minutes,
            transition_buffer_minutes=transition_buffer_minutes,
        )
    if unblocked_candidates == 0:
        return SmartSlotChoice(
            status="no_fit",
            reason="Minden beférő időpont másik öntözési futással ütközik.",
            window_start_at=window_start_at,
            window_end_at=window_end_at,
            duration_minutes=duration_minutes,
            transition_buffer_minutes=transition_buffer_minutes,
        )
    if candidates_with_forecast == 0:
        return SmartSlotChoice(
            status="forecast_unavailable",
            reason="Nincs teljes órás előrejelzés egyetlen beférő időpontra sem.",
            window_start_at=window_start_at,
            window_end_at=window_end_at,
            duration_minutes=duration_minutes,
            transition_buffer_minutes=transition_buffer_minutes,
        )
    if wind_rejections == candidates_with_forecast:
        return SmartSlotChoice(
            status="wind_blocked",
            reason="Minden előre jelezhető időpontban túl erős a szél.",
            window_start_at=window_start_at,
            window_end_at=window_end_at,
            duration_minutes=duration_minutes,
            transition_buffer_minutes=transition_buffer_minutes,
        )
    return planned_window


def _clock_parts(value: str) -> tuple[int, int]:
    hour, minute = (int(part) for part in value.split(":"))
    return hour, minute


def _normalize_local_time(value: datetime) -> datetime:
    """Round-trip local wall time so nonexistent DST minutes move forward."""
    if value.tzinfo is None:
        return value
    return value.astimezone(UTC).astimezone(value.tzinfo)


def _add_elapsed(value: datetime, delta: timedelta) -> datetime:
    """Add real elapsed time across daylight-saving transitions."""
    if value.tzinfo is None:
        return value + delta
    return (value.astimezone(UTC) + delta).astimezone(value.tzinfo)


def _first_candidate(
    window_start: datetime,
    earliest: datetime,
    step_minutes: int,
) -> datetime:
    if earliest <= window_start:
        return window_start
    elapsed = (_as_utc(earliest) - _as_utc(window_start)).total_seconds() / 60
    steps = ceil(elapsed / step_minutes)
    return _add_elapsed(window_start, timedelta(minutes=steps * step_minutes))


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _hour_timestamp(hour: ForecastHour) -> datetime:
    timestamp = hour.timestamp
    return timestamp if timestamp.tzinfo is not None else timestamp.replace(tzinfo=UTC)


def _covered_slot_hours(
    forecast: list[ForecastHour],
    starts_at: datetime,
    ends_at: datetime,
) -> list[ForecastHour] | None:
    """Return overlapping hours only when they continuously cover the slot."""
    overlapping = [
        hour
        for hour in forecast
        if _intervals_overlap(
            _hour_timestamp(hour),
            _add_elapsed(_hour_timestamp(hour), timedelta(hours=1)),
            starts_at,
            ends_at,
        )
    ]
    if not overlapping:
        return None
    covered_until = starts_at
    for hour in overlapping:
        hour_start = _hour_timestamp(hour)
        hour_end = _add_elapsed(hour_start, timedelta(hours=1))
        if hour_end <= covered_until:
            continue
        if hour_start > covered_until:
            return None
        covered_until = max(covered_until, hour_end)
        if covered_until >= ends_at:
            return overlapping
    return None


def _intervals_overlap(
    first_start: datetime,
    first_end: datetime,
    second_start: datetime,
    second_end: datetime,
) -> bool:
    return first_start < second_end and first_end > second_start


def _rainy_condition(condition: str) -> bool:
    value = condition.casefold()
    return value in RAINY_SLOT_CONDITIONS or "rain" in value or "eső" in value or "zápor" in value


def _daylight_value(hour: ForecastHour) -> float:
    if hour.is_daylight is not None:
        return float(hour.is_daylight)
    return 0.0 if hour.condition.casefold() == "clear-night" else 1.0


def _wind_utilization(
    max_speed: float | None,
    max_gust: float | None,
    thresholds: tuple[float, float] | None,
) -> float:
    if thresholds is None:
        return 0.0
    speed_threshold, gust_threshold = thresholds
    ratios = []
    if max_speed is not None and speed_threshold > 0:
        ratios.append(max_speed / speed_threshold)
    if max_gust is not None and gust_threshold > 0:
        ratios.append(max_gust / gust_threshold)
    return max(ratios, default=0.0)


def _selection_reason(
    scheduled_at: datetime,
    duration_minutes: int,
    rainy: bool,
    precipitation_mm: float,
    probability: float,
    wind_action: str,
    max_wind_speed_kmh: float | None,
    daylight_fraction: float,
    average_temperature: float,
    average_humidity_percent: float | None,
    transition_buffer_minutes: int,
) -> str:
    rain_text = (
        f"{precipitation_mm:g} mm eső, {probability:g}% esély"
        if rainy
        else f"száraz idő, {probability:g}% esély"
    )
    if wind_action == "warn":
        wind_text = "széladat nélkül"
    elif max_wind_speed_kmh is None:
        wind_text = "szél által nem érintett zónákkal"
    else:
        wind_text = f"legfeljebb {max_wind_speed_kmh:g} km/h széllel"
    light_text = "sötétben" if daylight_fraction == 0 else "világos időszakban"
    humidity_text = (
        f", {average_humidity_percent:g}% páratartalommal"
        if average_humidity_percent is not None
        else ""
    )
    buffer_text = (
        f" és {transition_buffer_minutes} perc műveleti tartalék"
        if transition_buffer_minutes
        else ""
    )
    return (
        f"{scheduled_at.strftime('%H:%M')} lett kiválasztva: {rain_text}, "
        f"{wind_text}, {light_text}, {average_temperature:g} °C{humidity_text}; "
        f"a {duration_minutes} perces program{buffer_text} teljesen belefér "
        "az ablakba."
    )
