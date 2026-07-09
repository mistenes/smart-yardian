"""Tests for soil-moisture based runtime adjustment."""

import pytest

from custom_components.smart_yardian.soil_moisture import (
    adjust_duration_for_soil_moisture,
    assess_soil_moisture,
)


def test_wet_soil_skips_the_zone() -> None:
    assessment = assess_soil_moisture(94)

    assert assessment.action == "skip"
    assert assessment.factor == 0
    assert adjust_duration_for_soil_moisture(25, assessment.factor) == 0


def test_moist_soil_reduces_runtime_linearly() -> None:
    assessment = assess_soil_moisture(67.5)

    assert assessment.action == "reduce"
    assert assessment.factor == pytest.approx(0.5)
    assert adjust_duration_for_soil_moisture(20, assessment.factor) == 10


def test_dry_soil_increases_runtime_with_a_safe_cap() -> None:
    moderately_dry = assess_soil_moisture(43)
    very_dry = assess_soil_moisture(10)

    assert moderately_dry.action == "increase"
    assert moderately_dry.factor == pytest.approx(1.096)
    assert adjust_duration_for_soil_moisture(20, moderately_dry.factor) == 22
    assert very_dry.factor == 1.2


def test_target_moisture_keeps_the_calculated_runtime() -> None:
    assessment = assess_soil_moisture(55)

    assert assessment.action == "normal"
    assert assessment.factor == 1
    assert adjust_duration_for_soil_moisture(20, 1) == 20


@pytest.mark.parametrize("value", [None, "unknown", -1, 101, float("nan")])
def test_invalid_reading_does_not_change_runtime(value: object) -> None:
    assessment = assess_soil_moisture(value)

    assert assessment.action == "unavailable"
    assert assessment.factor == 1
    assert assessment.percent is None


def test_custom_thresholds_are_used() -> None:
    assessment = assess_soil_moisture(
        70,
        {
            "soil_moisture_dry_percent": 25,
            "soil_moisture_target_percent": 50,
            "soil_moisture_skip_percent": 90,
            "soil_moisture_max_factor": 1.3,
        },
    )

    assert assessment.factor == pytest.approx(0.5)
