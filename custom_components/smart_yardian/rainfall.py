"""Parse measured precipitation observations from the Időkép rain map."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from difflib import SequenceMatcher
from html import unescape
import re
import unicodedata
from typing import Any

IDOKEP_RAIN_MAP_URL = "https://www.idokep.hu/csapadek"

_MAP_PATTERN = re.compile(
    r"<map\s+name=[\"']csap24a[\"']>(?P<body>.*?)</map>",
    re.IGNORECASE | re.DOTALL,
)
_AREA_PATTERN = re.compile(
    r"<area\b(?P<attributes>.*?)(?=<area\b|\Z)",
    re.IGNORECASE | re.DOTALL,
)
_STATION_PATTERN = re.compile(
    r"href=[\"'](?:https://www\.idokep\.hu)?/automata/(?P<station_id>[^\"']+)[\"']",
    re.IGNORECASE,
)
_COORDS_PATTERN = re.compile(r"coords=[\"'](?P<coords>[\d,\s]+)[\"']", re.IGNORECASE)
_TIP_PATTERN = re.compile(r"onmouseover='(?P<tip>[^']+)'", re.IGNORECASE)
_RAIN_PATTERN = re.compile(
    r'Tip\("(?P<measured>\d+(?:\.\d+)?)\s*mm\s*'
    r"\(radar\s*(?P<radar>\d+(?:\.\d+)?)\s*mm\)\s*"
    r"(?P<location>.+?)\s*\((?P<tip_station>[^()]+)\)<br>",
    re.IGNORECASE,
)


@dataclass(frozen=True, slots=True)
class RainObservation:
    """One Időkép automatic station observation from the 24-hour map."""

    station_id: str
    location: str
    measured_mm: float
    radar_mm: float
    map_x: float
    map_y: float

    def as_dict(self) -> dict[str, Any]:
        """Return a frontend-safe representation."""
        return asdict(self)


def _normalized(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", unescape(value))
    without_accents = "".join(
        character for character in decomposed if not unicodedata.combining(character)
    )
    return " ".join(
        re.sub(r"[^a-z0-9]+", " ", without_accents.lower()).split()
    )


def parse_idokep_rain_map(document: str) -> list[RainObservation]:
    """Extract the station rainfall values embedded in the Időkép 24-hour map."""
    map_match = _MAP_PATTERN.search(document)
    if map_match is None:
        return []

    observations: list[RainObservation] = []
    for area_match in _AREA_PATTERN.finditer(map_match.group("body")):
        attributes = area_match.group("attributes")
        station_match = _STATION_PATTERN.search(attributes)
        coords_match = _COORDS_PATTERN.search(attributes)
        tip_match = _TIP_PATTERN.search(attributes)
        if station_match is None or coords_match is None or tip_match is None:
            continue

        tip = unescape(tip_match.group("tip")).replace("&nbsp;", " ")
        rain_match = _RAIN_PATTERN.search(tip)
        if rain_match is None:
            continue
        station_id = unescape(station_match.group("station_id")).strip()
        if _normalized(rain_match.group("tip_station")) != _normalized(station_id):
            continue

        try:
            coords = [
                float(item.strip())
                for item in coords_match.group("coords").split(",")
            ]
            if len(coords) != 4:
                continue
            observations.append(
                RainObservation(
                    station_id=station_id,
                    location=" ".join(
                        unescape(rain_match.group("location"))
                        .replace("\xa0", " ")
                        .split()
                    ),
                    measured_mm=max(0.0, float(rain_match.group("measured"))),
                    radar_mm=max(0.0, float(rain_match.group("radar"))),
                    map_x=(coords[0] + coords[2]) / 2,
                    map_y=(coords[1] + coords[3]) / 2,
                )
            )
        except ValueError:
            continue
    return observations


def find_rain_stations(
    observations: list[RainObservation],
    city: str,
    *,
    limit: int = 20,
) -> list[RainObservation]:
    """Rank stations by their textual match to a user-entered settlement."""
    query = _normalized(city)
    if len(query) < 2:
        return []

    ranked: list[tuple[int, float, RainObservation]] = []
    for observation in observations:
        location = _normalized(observation.location)
        station_id = _normalized(observation.station_id)
        ratio = max(
            SequenceMatcher(None, query, location).ratio(),
            SequenceMatcher(None, query, station_id).ratio(),
        )
        if location == query:
            rank = 0
        elif location.startswith(f"{query} ") or location.endswith(f" {query}"):
            rank = 1
        elif query in location or query in station_id:
            rank = 2
        elif ratio >= 0.58:
            rank = 3
        else:
            continue
        ranked.append((rank, -ratio, observation))

    ranked.sort(
        key=lambda item: (
            item[0],
            item[1],
            _normalized(item[2].location),
            _normalized(item[2].station_id),
        )
    )
    return [item[2] for item in ranked[:limit]]
