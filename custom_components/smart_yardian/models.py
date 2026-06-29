"""Serializable domain models used by Smart Yardian."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any
from uuid import uuid4


@dataclass(slots=True)
class ForecastHour:
    """Normalized hourly weather sample."""

    timestamp: datetime
    temperature: float
    precipitation_mm: float
    precipitation_probability: float
    condition: str
    cloud_cover: float | None = None
    is_daylight: bool | None = None


@dataclass(slots=True)
class WeatherDecision:
    """Explainable irrigation adjustment."""

    factor: float
    source: str
    precipitation_mm: float
    max_probability: float
    max_temperature: float
    sunny_hours: float
    rainy_hours: int
    reason: str
    evaluated_at: datetime
    rain_factor: float = 1.0
    climate_factor: float = 1.0

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-safe representation."""
        data = asdict(self)
        data["evaluated_at"] = self.evaluated_at.isoformat()
        data["percent"] = round(self.factor * 100)
        return data


@dataclass(slots=True)
class ProgramZone:
    """A zone and its base watering duration."""

    entity_id: str
    duration_minutes: int
    duration_mode: str = "manual"

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ProgramZone:
        """Build and validate from stored or API data."""
        duration = int(data.get("duration_minutes", 15))
        if not 1 <= duration <= 180:
            raise ValueError("A zóna időtartama 1 és 180 perc közötti lehet.")
        duration_mode = str(data.get("duration_mode") or "manual")
        if duration_mode not in {"manual", "reference"}:
            raise ValueError("Az időtartam módja manuális vagy referencia lehet.")
        entity_id = str(data["entity_id"])
        if not entity_id.startswith("switch."):
            raise ValueError("Csak switch entitás használható Yardian zónaként.")
        return cls(
            entity_id=entity_id,
            duration_minutes=duration,
            duration_mode=duration_mode,
        )


@dataclass(slots=True)
class IrrigationProgram:
    """Stored weekly irrigation program."""

    name: str
    weekdays: list[int]
    start_time: str
    zones: list[ProgramZone]
    enabled: bool = True
    weather_adjustment: bool = True
    temperature_condition_enabled: bool = False
    temperature_condition_operator: str = "above"
    temperature_condition_value: float = 30.0
    program_id: str = field(default_factory=lambda: str(uuid4()))
    skip_next: bool = False

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> IrrigationProgram:
        """Build and validate a program."""
        name = str(data.get("name", "")).strip()
        if not 1 <= len(name) <= 64:
            raise ValueError("A program neve 1 és 64 karakter közötti lehet.")

        weekdays = sorted({int(day) for day in data.get("weekdays", [])})
        if not weekdays or any(day < 0 or day > 6 for day in weekdays):
            raise ValueError("Legalább egy érvényes napot ki kell választani.")

        start_time = str(data.get("start_time", ""))
        try:
            hour, minute = (int(part) for part in start_time.split(":", 1))
        except (TypeError, ValueError) as err:
            raise ValueError("A kezdési idő HH:MM formátumú legyen.") from err
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("Érvénytelen kezdési idő.")

        zones = [ProgramZone.from_dict(zone) for zone in data.get("zones", [])]
        if not zones:
            raise ValueError("A programhoz legalább egy zóna szükséges.")
        if len({zone.entity_id for zone in zones}) != len(zones):
            raise ValueError("Egy zóna csak egyszer szerepelhet a programban.")

        temperature_operator = str(
            data.get("temperature_condition_operator") or "above"
        )
        if temperature_operator not in {"above", "below"}:
            raise ValueError("A hőmérséklet-feltétel felette vagy alatta lehet.")
        try:
            temperature_value = float(
                data.get("temperature_condition_value", 30)
            )
        except (TypeError, ValueError) as err:
            raise ValueError("A hőmérsékleti küszöb szám legyen.") from err
        if not -30 <= temperature_value <= 60:
            raise ValueError(
                "A hőmérsékleti küszöb -30 és 60 °C közötti lehet."
            )

        return cls(
            program_id=str(data.get("program_id") or uuid4()),
            name=name,
            enabled=bool(data.get("enabled", True)),
            weekdays=weekdays,
            start_time=f"{hour:02d}:{minute:02d}",
            weather_adjustment=bool(data.get("weather_adjustment", True)),
            temperature_condition_enabled=bool(
                data.get("temperature_condition_enabled", False)
            ),
            temperature_condition_operator=temperature_operator,
            temperature_condition_value=temperature_value,
            zones=zones,
            skip_next=bool(data.get("skip_next", False)),
        )

    def temperature_condition_matches(self, max_temperature: float) -> bool:
        """Return whether the forecast temperature permits this program."""
        if not self.temperature_condition_enabled:
            return True
        if self.temperature_condition_operator == "above":
            return max_temperature > self.temperature_condition_value
        return max_temperature < self.temperature_condition_value

    def temperature_condition_reason(self, max_temperature: float) -> str:
        """Explain why a temperature-conditioned program was skipped."""
        relation = (
            "nem magasabb"
            if self.temperature_condition_operator == "above"
            else "nem alacsonyabb"
        )
        return (
            f"A következő 24 óra maximuma {max_temperature:g} °C, ami {relation} "
            f"{self.temperature_condition_value:g} °C-nál."
        )

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-safe representation."""
        return asdict(self)


@dataclass(slots=True)
class RunRecord:
    """Persisted irrigation run audit record."""

    run_id: str
    program_id: str | None
    program_name: str
    scheduled_at: str
    started_at: str | None
    completed_at: str | None
    outcome: str
    reason: str
    factor: float
    weather_source: str
    zones: list[dict[str, Any]]

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-safe representation."""
        return asdict(self)
