"""Soil-moisture based irrigation runtime adjustment."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class SoilMoistureAssessment:
    """Explain one sensor reading and its runtime multiplier."""

    percent: float | None
    factor: float
    action: str
    reason: str


def assess_soil_moisture(
    value: Any,
    settings: dict[str, Any] | None = None,
) -> SoilMoistureAssessment:
    """Convert a percentage reading into a bounded irrigation multiplier."""
    settings = settings or {}
    try:
        percent = float(value)
    except (TypeError, ValueError):
        return SoilMoistureAssessment(
            None,
            1.0,
            "unavailable",
            "A talajnedvesség-érték nem elérhető; az időtartam nem módosul.",
        )
    if not 0 <= percent <= 100:
        return SoilMoistureAssessment(
            None,
            1.0,
            "unavailable",
            "A talajnedvesség-érték nem 0–100% közötti; az időtartam nem módosul.",
        )

    dry = float(settings.get("soil_moisture_dry_percent", 30.0))
    target = float(settings.get("soil_moisture_target_percent", 55.0))
    skip = float(settings.get("soil_moisture_skip_percent", 80.0))
    max_factor = float(settings.get("soil_moisture_max_factor", 1.2))
    if not (0 <= dry < target < skip <= 100) or not 1 <= max_factor <= 2:
        return SoilMoistureAssessment(
            percent,
            1.0,
            "unavailable",
            "A talajnedvesség-küszöbök hibásak; az időtartam nem módosul.",
        )

    if percent >= skip:
        return SoilMoistureAssessment(
            percent,
            0.0,
            "skip",
            f"{percent:g}% talajnedvesség eléri a {skip:g}%-os kihagyási küszöböt.",
        )
    if percent > target:
        factor = (skip - percent) / (skip - target)
        return SoilMoistureAssessment(
            percent,
            factor,
            "reduce",
            f"{percent:g}% talajnedvesség: az öntözési idő {round(factor * 100)}%-a.",
        )
    if percent < target:
        if percent <= dry:
            factor = max_factor
        else:
            dryness = (target - percent) / (target - dry)
            factor = 1.0 + dryness * (max_factor - 1.0)
        return SoilMoistureAssessment(
            percent,
            factor,
            "increase",
            f"{percent:g}% talajnedvesség: az öntözési idő {round(factor * 100)}%-a.",
        )
    return SoilMoistureAssessment(
        percent,
        1.0,
        "normal",
        f"{percent:g}% talajnedvesség a beállított célértéken van.",
    )


def adjust_duration_for_soil_moisture(minutes: int, factor: float) -> int:
    """Apply a moisture factor while preserving whole-minute Yardian limits."""
    if minutes <= 0 or factor <= 0:
        return 0
    return max(1, min(180, round(minutes * factor)))
