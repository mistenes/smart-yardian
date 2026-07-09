"""Reference-based irrigation duration calculations."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

HEAD_REFERENCE_RATES: dict[str, float] = {
    "rotator": 10.0,
    "mp800": 20.0,
    "spray": 40.0,
    "rotor": 12.0,
    "drip": 12.0,
}

EXPOSURE_FACTORS: dict[str, float] = {
    "sunny": 1.0,
    "shady": 0.8,
}


@dataclass(slots=True)
class ZoneProfile:
    """Hydraulic properties used for reference-based scheduling."""

    entity_id: str
    head_type: str
    reference_rate_mm_h: float
    flow_l_min: float | None = None
    area_m2: float | None = None
    exposure: str = "sunny"
    moisture_sensor_entity_id: str | None = None

    @classmethod
    def default(cls, entity_id: str) -> ZoneProfile:
        """Return a conservative default profile."""
        return cls(entity_id, "rotator", HEAD_REFERENCE_RATES["rotator"])

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ZoneProfile:
        """Build and validate a stored or API profile."""
        entity_id = str(data["entity_id"])
        if not entity_id.startswith("switch."):
            raise ValueError("Csak switch entitás használható Yardian zónaként.")

        head_type = str(data.get("head_type") or "rotator")
        if head_type not in HEAD_REFERENCE_RATES:
            raise ValueError(f"Ismeretlen szórófejtípus: {head_type}")

        reference_rate = _bounded_float(
            data.get("reference_rate_mm_h", HEAD_REFERENCE_RATES[head_type]),
            "A referencia intenzitás",
            0.1,
            200,
        )
        flow = _optional_bounded_float(
            data.get("flow_l_min"), "A zóna vízhozama", 0.1, 1000
        )
        area = _optional_bounded_float(
            data.get("area_m2"), "Az öntözött terület", 0.1, 10000
        )
        exposure = str(data.get("exposure") or "sunny")
        if exposure not in EXPOSURE_FACTORS:
            raise ValueError(f"Ismeretlen területjelleg: {exposure}")
        moisture_sensor = str(data.get("moisture_sensor_entity_id") or "").strip()
        if moisture_sensor and not moisture_sensor.startswith("sensor."):
            raise ValueError(
                "Talajnedvességmérőként csak sensor entitás használható."
            )
        return cls(
            entity_id,
            head_type,
            reference_rate,
            flow,
            area,
            exposure,
            moisture_sensor or None,
        )

    @property
    def effective_rate_mm_h(self) -> float:
        """Return measured or reference precipitation rate in mm/hour."""
        if self.flow_l_min is not None and self.area_m2 is not None:
            return self.flow_l_min * 60 / self.area_m2
        return self.reference_rate_mm_h

    @property
    def rate_source(self) -> str:
        """Explain which rate is active."""
        if self.flow_l_min is not None and self.area_m2 is not None:
            return "vízhozam és terület"
        return "fejtípus referencia"

    @property
    def exposure_factor(self) -> float:
        """Return the runtime multiplier for sunny or shaded areas."""
        return EXPOSURE_FACTORS[self.exposure]

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-safe representation with derived values."""
        data = asdict(self)
        data["effective_rate_mm_h"] = round(self.effective_rate_mm_h, 2)
        data["rate_source"] = self.rate_source
        data["exposure_factor"] = self.exposure_factor
        return data


@dataclass(frozen=True, slots=True)
class WateringTarget:
    """Recommended water depth for the forecast temperature band."""

    depth_mm: float
    cadence: str
    label: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def seasonal_target(max_temperature: float) -> WateringTarget:
    """Map temperature to the midpoint of the supplied lawn reference table."""
    if max_temperature >= 35:
        return WateringTarget(9.0, "naponta", "Kánikula")
    if max_temperature >= 25:
        return WateringTarget(5.5, "kétnaponta", "Nyár")
    if max_temperature >= 20:
        return WateringTarget(4.5, "heti háromszor", "Tavasz")
    return WateringTarget(2.5, "heti kétszer", "Kora tavasz / hűvös idő")


def reference_duration_minutes(
    profile: ZoneProfile,
    max_temperature: float,
    rain_factor: float = 1.0,
) -> int:
    """Convert target millimetres into a safe whole-minute runtime."""
    target_mm = (
        seasonal_target(max_temperature).depth_mm
        * max(0.0, rain_factor)
        * profile.exposure_factor
    )
    minutes = round(target_mm / profile.effective_rate_mm_h * 60)
    return max(1, min(180, minutes))


def reference_duration_for_depth(
    profile: ZoneProfile,
    target_mm: float,
    rain_factor: float = 1.0,
) -> int:
    """Convert an ET-derived target depth into a safe whole-minute runtime."""
    adjusted_target_mm = (
        max(0.0, float(target_mm))
        * max(0.0, float(rain_factor))
        * profile.exposure_factor
    )
    minutes = round(adjusted_target_mm / profile.effective_rate_mm_h * 60)
    return max(1, min(180, minutes))


def _bounded_float(value: Any, label: str, minimum: float, maximum: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as err:
        raise ValueError(f"{label} szám legyen.") from err
    if not minimum <= number <= maximum:
        raise ValueError(f"{label} {minimum} és {maximum} közé essen.")
    return number


def _optional_bounded_float(
    value: Any, label: str, minimum: float, maximum: float
) -> float | None:
    if value in (None, ""):
        return None
    return _bounded_float(value, label, minimum, maximum)
