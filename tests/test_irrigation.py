"""Tests for reference-based irrigation duration calculations."""

from custom_components.smart_yardian.irrigation import (
    ZoneProfile,
    reference_duration_minutes,
    seasonal_target,
)


def test_head_reference_rate_is_used_without_hydraulic_data() -> None:
    profile = ZoneProfile.from_dict(
        {
            "entity_id": "switch.gyep",
            "head_type": "rotator",
            "reference_rate_mm_h": 10,
        }
    )
    assert profile.effective_rate_mm_h == 10
    assert reference_duration_minutes(profile, 29) == 33


def test_total_flow_and_area_override_head_reference() -> None:
    profile = ZoneProfile.from_dict(
        {
            "entity_id": "switch.gyep",
            "head_type": "rotor",
            "reference_rate_mm_h": 12,
            "flow_l_min": 20,
            "area_m2": 100,
        }
    )
    assert profile.effective_rate_mm_h == 12
    assert profile.rate_source == "vízhozam és terület"


def test_rain_factor_reduces_reference_duration_without_heat_double_counting() -> None:
    profile = ZoneProfile.default("switch.gyep")
    assert reference_duration_minutes(profile, 36, rain_factor=0.65) == 35


def test_temperature_reference_bands_fill_table_gaps() -> None:
    assert seasonal_target(18).depth_mm == 2.5
    assert seasonal_target(20).depth_mm == 4.5
    assert seasonal_target(30).depth_mm == 5.5
    assert seasonal_target(35).depth_mm == 9
