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
    assert IrrigationProgram.from_dict(program.as_dict()).as_dict() == program.as_dict()


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
