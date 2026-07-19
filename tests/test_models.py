"""Tests for serializable Smart Yardian domain models."""

from __future__ import annotations

import pytest

from custom_components.smart_yardian.models import IrrigationProgram, RunRecord


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
    assert program.soil_moisture_enabled is False
    assert program.schedule_mode == "fixed"
    assert program.window_start_time is None
    assert program.window_end_time is None
    assert IrrigationProgram.from_dict(program.as_dict()).as_dict() == program.as_dict()
    assert all(zone.duration_mode == "manual" for zone in program.zones)


def test_smart_window_roundtrip_normalizes_times_and_uses_opening_fallback() -> None:
    program = IrrigationProgram.from_dict(
        {
            "program_id": "smart-night",
            "name": "Intelligens éjszakai öntözés",
            "weekdays": [0, 2],
            "schedule_mode": "smart_window",
            "window_start_time": "22:30",
            "window_end_time": "5:30",
            "zones": [
                {
                    "entity_id": "switch.gyep",
                    "duration_minutes": 15,
                    "duration_mode": "reference",
                }
            ],
        }
    )

    assert program.schedule_mode == "smart_window"
    assert program.start_time == "22:30"
    assert program.window_start_time == "22:30"
    assert program.window_end_time == "05:30"
    assert IrrigationProgram.from_dict(program.as_dict()).as_dict() == program.as_dict()


@pytest.mark.parametrize(
    ("start", "end", "message"),
    [
        ("05:00", "05:00", "nem lehet azonos"),
        ("05:00", "05:15", "30 perc és 18 óra"),
        ("05:00", "00:00", "30 perc és 18 óra"),
    ],
)
def test_smart_window_rejects_invalid_duration(
    start: str,
    end: str,
    message: str,
) -> None:
    with pytest.raises(ValueError, match=message):
        IrrigationProgram.from_dict(
            {
                "name": "Hibás intelligens ablak",
                "weekdays": [0],
                "schedule_mode": "smart_window",
                "window_start_time": start,
                "window_end_time": end,
                "zones": [{"entity_id": "switch.gyep", "duration_minutes": 10}],
            }
        )


def test_smart_window_requires_both_bounds() -> None:
    with pytest.raises(ValueError, match="kezdő és záró idő kötelező"):
        IrrigationProgram.from_dict(
            {
                "name": "Hiányos intelligens ablak",
                "weekdays": [0],
                "schedule_mode": "smart_window",
                "window_start_time": "05:00",
                "zones": [{"entity_id": "switch.gyep", "duration_minutes": 10}],
            }
        )


def test_smart_window_rejects_unknown_schedule_mode() -> None:
    with pytest.raises(ValueError, match="ütemezési mód"):
        IrrigationProgram.from_dict(
            {
                "name": "Ismeretlen mód",
                "weekdays": [0],
                "start_time": "05:00",
                "schedule_mode": "automatic",
                "zones": [{"entity_id": "switch.gyep", "duration_minutes": 10}],
            }
        )


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
    above = IrrigationProgram.from_dict({**base, "temperature_condition_operator": "above"})
    below = IrrigationProgram.from_dict({**base, "temperature_condition_operator": "below"})

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
                "zones": [{"entity_id": "switch.gyep", "duration_minutes": 15}],
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


def test_run_record_preserves_weather_decision_snapshot() -> None:
    record = RunRecord(
        run_id="run-1",
        program_id="program-1",
        program_name="Általános öntözés",
        scheduled_at="2026-07-01T02:00:00+02:00",
        started_at=None,
        completed_at="2026-07-01T02:00:01+02:00",
        outcome="skipped",
        reason="Eső miatt kimarad.",
        factor=0,
        weather_source="Időkép",
        zones=[],
        weather={
            "precipitation_mm": 2.9,
            "max_probability": 92,
            "rainy_hours": 3,
            "max_temperature": 32,
        },
    )

    assert record.as_dict()["weather"] == {
        "precipitation_mm": 2.9,
        "max_probability": 92,
        "rainy_hours": 3,
        "max_temperature": 32,
    }
