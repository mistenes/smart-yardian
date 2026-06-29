"""Tests for serializable Smart Yardian domain models."""

from __future__ import annotations

import pytest

from custom_components.smart_yardian.models import IrrigationProgram


def test_program_roundtrip_preserves_zone_order() -> None:
    program = IrrigationProgram.from_dict(
        {
            "program_id": "morning",
            "name": "Reggeli kert",
            "weekdays": [4, 0, 2],
            "start_time": "5:30",
            "enabled": True,
            "weather_adjustment": True,
            "zones": [
                {"entity_id": "switch.gyep", "duration_minutes": 15},
                {"entity_id": "switch.soveny", "duration_minutes": 20},
            ],
        }
    )

    assert program.start_time == "05:30"
    assert program.weekdays == [0, 2, 4]
    assert [zone.entity_id for zone in program.zones] == [
        "switch.gyep",
        "switch.soveny",
    ]
    assert program.temperature_condition_enabled is False
    assert IrrigationProgram.from_dict(program.as_dict()).as_dict() == program.as_dict()
    assert all(zone.duration_mode == "manual" for zone in program.zones)


def test_reference_duration_mode_roundtrip() -> None:
    program = IrrigationProgram.from_dict(
        {
            "name": "Referencia",
            "weekdays": [1],
            "start_time": "06:00",
            "zones": [
                {
                    "entity_id": "switch.gyep",
                    "duration_minutes": 15,
                    "duration_mode": "reference",
                }
            ],
        }
    )
    assert program.zones[0].duration_mode == "reference"
    assert IrrigationProgram.from_dict(program.as_dict()).as_dict() == program.as_dict()


def test_temperature_condition_above_and_below() -> None:
    base = {
        "name": "Meleg napi program",
        "weekdays": [0],
        "start_time": "05:30",
        "zones": [{"entity_id": "switch.gyep", "duration_minutes": 15}],
        "temperature_condition_enabled": True,
        "temperature_condition_value": 30,
    }
    above = IrrigationProgram.from_dict(
        {**base, "temperature_condition_operator": "above"}
    )
    below = IrrigationProgram.from_dict(
        {**base, "temperature_condition_operator": "below"}
    )

    assert above.temperature_condition_matches(31)
    assert not above.temperature_condition_matches(30)
    assert below.temperature_condition_matches(29)
    assert not below.temperature_condition_matches(30)
    assert "nem magasabb" in above.temperature_condition_reason(28)


def test_temperature_condition_rejects_unsafe_threshold() -> None:
    with pytest.raises(ValueError, match="-30 és 60"):
        IrrigationProgram.from_dict(
            {
                "name": "Hibás hőmérséklet",
                "weekdays": [0],
                "start_time": "05:30",
                "temperature_condition_enabled": True,
                "temperature_condition_value": 80,
                "zones": [
                    {"entity_id": "switch.gyep", "duration_minutes": 15}
                ],
            }
        )


@pytest.mark.parametrize("duration", [0, 181])
def test_program_rejects_unsafe_duration(duration: int) -> None:
    with pytest.raises(ValueError, match="1 és 180"):
        IrrigationProgram.from_dict(
            {
                "name": "Hibás",
                "weekdays": [0],
                "start_time": "05:30",
                "zones": [
                    {
                        "entity_id": "switch.gyep",
                        "duration_minutes": duration,
                    }
                ],
            }
        )


def test_program_rejects_duplicate_zone() -> None:
    with pytest.raises(ValueError, match="csak egyszer"):
        IrrigationProgram.from_dict(
            {
                "name": "Dupla",
                "weekdays": [0],
                "start_time": "05:30",
                "zones": [
                    {"entity_id": "switch.gyep", "duration_minutes": 10},
                    {"entity_id": "switch.gyep", "duration_minutes": 12},
                ],
            }
        )
