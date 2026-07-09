"""Extract hourly wind data directly from Időkép forecast cards."""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, replace
from datetime import datetime, time, timedelta
from html import unescape

from .models import ForecastHour

IDOKEP_FORECAST_URL = "https://www.idokep.hu/elorejelzes/{location}"

# Időkép exposes a Beaufort-like category as a CSS class rather than a numeric
# value. These are the representative speeds used by the Időkép HA integration,
# expressed in km/h.
_WIND_SPEED_BY_CLASS = {
    "szelcsend": 0.0,
    "gyenge-szello": 4.0,
    "gyengeszello": 4.0,
    "enyhe": 9.0,
    "gyenge": 15.0,
    "mersekelt": 25.0,
    "elenk": 35.0,
    "eros": 45.0,
    "viharos": 55.0,
    "elenk-viharos": 66.0,
    "heves-vihar": 79.0,
    "duhongo-vihar": 93.0,
    "heves-szelvesz": 108.0,
    "orkan": 118.0,
}

_CARD_PATTERN = re.compile(
    r"<div\b[^>]*class=[\"'][^\"']*\bwide-hourly-forecast-card\b[^\"']*[\"'][^>]*>",
    re.IGNORECASE,
)
_HOUR_PATTERN = re.compile(
    r"<div\b[^>]*class=[\"'][^\"']*\bwide-hourly-forecast-hour\b[^\"']*"
    r"[\"'][^>]*>(?P<body>.*?)</div>",
    re.IGNORECASE | re.DOTALL,
)
_DIV_PATTERN = re.compile(r"<div\b(?P<attributes>[^>]*)>", re.IGNORECASE)
_CLASS_PATTERN = re.compile(r"class=[\"'](?P<value>[^\"']*)[\"']", re.IGNORECASE)
_DIRECTION_PATTERN = re.compile(
    r"--rotateAngle\s*:\s*(?P<degrees>-?\d+(?:\.\d+)?)deg",
    re.IGNORECASE,
)
_TIME_PATTERN = re.compile(r"(?P<hour>\d{1,2}):(?P<minute>\d{2})")
_TAG_PATTERN = re.compile(r"<[^>]+>")


@dataclass(frozen=True, slots=True)
class IdokepWindHour:
    """One numeric wind sample reconstructed from an Időkép hourly card."""

    timestamp: datetime
    wind_speed_kmh: float
    wind_bearing_deg: float | None = None


def _wind_div(card: str) -> tuple[float, float | None] | None:
    for match in _DIV_PATTERN.finditer(card):
        attributes = match.group("attributes")
        class_match = _CLASS_PATTERN.search(attributes)
        if class_match is None:
            continue
        classes = class_match.group("value").lower().split()
        if "wind" not in classes:
            continue
        wind_speed = next(
            (speed for name, speed in _WIND_SPEED_BY_CLASS.items() if name in classes),
            None,
        )
        if wind_speed is None:
            return None
        direction_match = _DIRECTION_PATTERN.search(attributes)
        direction = (
            float(direction_match.group("degrees")) % 360 if direction_match is not None else None
        )
        return wind_speed, direction
    return None


def parse_idokep_hourly_wind(
    document: str,
    now: datetime,
) -> list[IdokepWindHour]:
    """Parse ordered Időkép hourly cards and rebuild their local timestamps."""
    if now.tzinfo is None:
        raise ValueError("Az Időkép szélidővonalához időzóna szükséges.")

    cards = _CARD_PATTERN.split(document)[1:]
    samples: list[IdokepWindHour] = []
    current_date = now.date()
    previous_hour = now.hour

    for card in cards:
        hour_match = _HOUR_PATTERN.search(card)
        if hour_match is None:
            continue
        hour_text = unescape(_TAG_PATTERN.sub(" ", hour_match.group("body")))
        time_match = _TIME_PATTERN.search(hour_text)
        if time_match is None:
            continue
        hour = int(time_match.group("hour"))
        minute = int(time_match.group("minute"))
        if not 0 <= hour <= 23 or not 0 <= minute <= 59:
            continue
        if hour < previous_hour:
            current_date += timedelta(days=1)
        previous_hour = hour
        wind = _wind_div(card)
        if wind is None:
            continue
        samples.append(
            IdokepWindHour(
                timestamp=datetime.combine(
                    current_date,
                    time(hour=hour, minute=minute),
                    tzinfo=now.tzinfo,
                ),
                wind_speed_kmh=wind[0],
                wind_bearing_deg=wind[1],
            )
        )
    return samples


def merge_idokep_hourly_wind(
    forecast: Iterable[ForecastHour],
    wind_hours: Iterable[IdokepWindHour],
) -> list[ForecastHour]:
    """Fill only missing wind fields using timestamp-matched Időkép cards."""
    samples = list(wind_hours)
    enriched: list[ForecastHour] = []
    for hour in forecast:
        hour_timestamp = hour.timestamp.replace(second=0, microsecond=0)
        sample = next(
            (
                candidate
                for candidate in samples
                if candidate.timestamp.astimezone(hour.timestamp.tzinfo).replace(
                    second=0,
                    microsecond=0,
                )
                == hour_timestamp
            ),
            None,
        )
        if sample is None:
            enriched.append(hour)
            continue
        enriched.append(
            replace(
                hour,
                wind_speed_kmh=(
                    hour.wind_speed_kmh
                    if hour.wind_speed_kmh is not None
                    else sample.wind_speed_kmh
                ),
                wind_bearing_deg=(
                    hour.wind_bearing_deg
                    if hour.wind_bearing_deg is not None
                    else sample.wind_bearing_deg
                ),
            )
        )
    return enriched
