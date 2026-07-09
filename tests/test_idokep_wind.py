"""Tests for the direct Időkép hourly-wind fallback."""

from __future__ import annotations

from datetime import UTC, datetime

from custom_components.smart_yardian.idokep_wind import (
    merge_idokep_hourly_wind,
    parse_idokep_hourly_wind,
)
from custom_components.smart_yardian.models import ForecastHour

SAMPLE = """
<div class="wide-hourly-forecast-card">
  <div class="ik wide-hourly-forecast-hour">22:00</div>
  <div class="ik hourly-wind">
    <a data-bs-content="Gyenge északi szél">
      <div class="ik wind gyenge" style="--rotateAngle:1deg"></div>
    </a>
  </div>
</div>
<div class="wide-hourly-forecast-card">
  <div class="ik wide-hourly-forecast-hour">23:00</div>
  <div class="ik hourly-wind">
    <a><div class="ik wind mersekelt" style="--rotateAngle:270deg"></div></a>
  </div>
</div>
<div class="wide-hourly-forecast-card">
  <div class="ik wide-hourly-forecast-hour">00:00</div>
  <div class="ik hourly-wind">
    <a><div class="ik wind elenk" style="--rotateAngle:360deg"></div></a>
  </div>
</div>
"""


def _forecast(timestamp: datetime, wind_speed: float | None = None) -> ForecastHour:
    return ForecastHour(
        timestamp=timestamp,
        temperature=24,
        precipitation_mm=0,
        precipitation_probability=0,
        condition="clear-night",
        wind_speed_kmh=wind_speed,
    )


def test_parse_idokep_wind_categories_and_midnight_rollover() -> None:
    samples = parse_idokep_hourly_wind(
        SAMPLE,
        datetime(2026, 7, 9, 22, 10, tzinfo=UTC),
    )

    assert [sample.wind_speed_kmh for sample in samples] == [15, 25, 35]
    assert [sample.wind_bearing_deg for sample in samples] == [1, 270, 0]
    assert samples[0].timestamp.isoformat() == "2026-07-09T22:00:00+00:00"
    assert samples[2].timestamp.isoformat() == "2026-07-10T00:00:00+00:00"


def test_merge_fills_only_missing_wind_values_by_timestamp() -> None:
    samples = parse_idokep_hourly_wind(
        SAMPLE,
        datetime(2026, 7, 9, 22, 10, tzinfo=UTC),
    )
    forecast = [
        _forecast(datetime(2026, 7, 9, 22, tzinfo=UTC)),
        _forecast(datetime(2026, 7, 9, 23, tzinfo=UTC), wind_speed=12),
        _forecast(datetime(2026, 7, 10, 0, tzinfo=UTC)),
    ]

    merged = merge_idokep_hourly_wind(forecast, samples)

    assert [hour.wind_speed_kmh for hour in merged] == [15, 12, 35]
    assert [hour.wind_bearing_deg for hour in merged] == [1, 270, 0]


def test_unknown_wind_class_is_not_invented() -> None:
    document = SAMPLE.replace("wind elenk", "wind ismeretlen") + """
<div class="wide-hourly-forecast-card">
  <div class="ik wide-hourly-forecast-hour">01:00</div>
  <div class="ik hourly-wind">
    <a><div class="ik wind gyenge" style="--rotateAngle:45deg"></div></a>
  </div>
</div>
"""

    samples = parse_idokep_hourly_wind(
        document,
        datetime(2026, 7, 9, 22, 10, tzinfo=UTC),
    )

    assert [sample.wind_speed_kmh for sample in samples] == [15, 25, 15]
    assert samples[-1].timestamp.isoformat() == "2026-07-10T01:00:00+00:00"
