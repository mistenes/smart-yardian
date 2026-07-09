"""Daily Hargreaves-Samani evapotranspiration estimates."""

from __future__ import annotations

from dataclasses import dataclass
from math import acos, cos, pi, radians, sin, sqrt, tan
from statistics import fmean
from typing import Iterable

from .models import ForecastHour

SOLAR_CONSTANT_MJ_M2_MIN = 0.0820
MJ_TO_EQUIVALENT_WATER_MM = 0.408
MIN_TEMPERATURE_RANGE_C = 2.0

CONDITION_SOLAR_SCORES = {
    "sunny": 1.0,
    "partlycloudy": 0.65,
    "cloudy": 0.25,
    "fog": 0.15,
    "rainy": 0.15,
    "pouring": 0.05,
    "lightning": 0.1,
    "lightning-rainy": 0.05,
    "clear-night": 0.0,
}


@dataclass(frozen=True, slots=True)
class EvapotranspirationEstimate:
    """Explainable daily ET0 result in millimetres."""

    et0_mm: float
    adjusted_et0_mm: float
    min_temperature: float
    max_temperature: float
    mean_temperature: float
    extraterrestrial_radiation_mj_m2_day: float
    cloud_factor: float
    wind_factor: float
    average_wind_speed_kmh: float | None


def extraterrestrial_radiation_mj_m2_day(
    latitude: float,
    day_of_year: int,
) -> float:
    """Calculate FAO-56 extraterrestrial radiation for one day."""
    latitude = max(-90.0, min(90.0, float(latitude)))
    day_of_year = max(1, min(366, int(day_of_year)))
    latitude_rad = radians(latitude)
    inverse_distance = 1 + 0.033 * cos(2 * pi * day_of_year / 365)
    solar_declination = 0.409 * sin(2 * pi * day_of_year / 365 - 1.39)
    sunset_argument = -tan(latitude_rad) * tan(solar_declination)
    sunset_hour_angle = acos(max(-1.0, min(1.0, sunset_argument)))
    radiation = (
        (24 * 60 / pi)
        * SOLAR_CONSTANT_MJ_M2_MIN
        * inverse_distance
        * (
            sunset_hour_angle * sin(latitude_rad) * sin(solar_declination)
            + cos(latitude_rad)
            * cos(solar_declination)
            * sin(sunset_hour_angle)
        )
    )
    return max(0.0, radiation)


def hargreaves_samani_et0_mm(
    min_temperature: float,
    max_temperature: float,
    mean_temperature: float,
    extraterrestrial_radiation_mj_m2_day_value: float,
) -> float:
    """Estimate reference ET0 using Ra expressed as equivalent water depth."""
    temperature_range = max(
        MIN_TEMPERATURE_RANGE_C,
        float(max_temperature) - float(min_temperature),
    )
    ra_equivalent_mm = (
        max(0.0, float(extraterrestrial_radiation_mj_m2_day_value))
        * MJ_TO_EQUIVALENT_WATER_MM
    )
    return max(
        0.0,
        0.0023
        * ra_equivalent_mm
        * (float(mean_temperature) + 17.8)
        * sqrt(temperature_range),
    )


def estimate_daily_evapotranspiration(
    forecast: Iterable[ForecastHour],
    latitude: float,
) -> EvapotranspirationEstimate:
    """Estimate daily ET0 and adjust it with available sun/cloud and wind data."""
    hours = list(forecast)
    if not hours:
        raise ValueError("A párolgásszámításhoz nincs órás előrejelzés.")

    temperatures = [float(hour.temperature) for hour in hours]
    min_temperature = min(temperatures)
    max_temperature = max(temperatures)
    mean_temperature = fmean(temperatures)
    middle_hour = hours[len(hours) // 2]
    day_of_year = middle_hour.timestamp.timetuple().tm_yday
    radiation = extraterrestrial_radiation_mj_m2_day(latitude, day_of_year)
    et0 = hargreaves_samani_et0_mm(
        min_temperature,
        max_temperature,
        mean_temperature,
        radiation,
    )

    daylight_hours = [
        hour
        for hour in hours
        if hour.is_daylight is True
        or (hour.is_daylight is None and hour.condition != "clear-night")
    ]
    solar_scores = [_solar_score(hour) for hour in daylight_hours]
    solar_fraction = fmean(solar_scores) if solar_scores else 0.5
    cloud_factor = 0.75 + 0.35 * max(0.0, min(1.0, solar_fraction))

    wind_speeds = [
        float(hour.wind_speed_kmh)
        for hour in hours
        if hour.wind_speed_kmh is not None
    ]
    average_wind = fmean(wind_speeds) if wind_speeds else None
    wind_factor = (
        1.0
        if average_wind is None
        else 1.0 + min(0.15, max(0.0, average_wind - 5.0) / 100.0)
    )

    return EvapotranspirationEstimate(
        et0_mm=et0,
        adjusted_et0_mm=et0 * cloud_factor * wind_factor,
        min_temperature=min_temperature,
        max_temperature=max_temperature,
        mean_temperature=mean_temperature,
        extraterrestrial_radiation_mj_m2_day=radiation,
        cloud_factor=cloud_factor,
        wind_factor=wind_factor,
        average_wind_speed_kmh=average_wind,
    )


def _solar_score(hour: ForecastHour) -> float:
    condition_score = CONDITION_SOLAR_SCORES.get(hour.condition, 0.5)
    if hour.cloud_cover is None:
        return condition_score
    cloud_score = 1.0 - max(0.0, min(100.0, float(hour.cloud_cover))) / 100.0
    return (condition_score + cloud_score) / 2
