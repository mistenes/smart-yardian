"""Constants for Smart Yardian."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "smart_yardian"
NAME: Final = "Smart Yardian"

CONF_WEATHER_ENTITY: Final = "weather_entity"
CONF_ZONE_ENTITIES: Final = "zone_entities"
CONF_NOTIFY_SERVICE: Final = "notify_service"

PANEL_URL: Final = "smart-yardian"
PANEL_COMPONENT: Final = "smart-yardian-panel"
PANEL_STATIC_URL: Final = "/smart_yardian/smart-yardian-panel.js"
PANEL_MODULE_URL: Final = f"{PANEL_STATIC_URL}?v=0.18.0"

STORE_VERSION: Final = 1
STORE_KEY_PREFIX: Final = "smart_yardian"
MAX_HISTORY: Final = 200

SERVICE_RUN_PROGRAM: Final = "run_program"
SERVICE_START_ZONE: Final = "start_zone"
SERVICE_STOP_ALL: Final = "stop_all"
SERVICE_SKIP_NEXT: Final = "skip_next"
SERVICE_PAUSE_UNTIL: Final = "pause_until"

WS_PREFIX: Final = "smart_yardian"

WEATHER_MAX_AGE_SECONDS: Final = 90 * 60
MIN_FORECAST_HOURS: Final = 12
FORECAST_HORIZON_HOURS: Final = 24
RAIN_MAP_CACHE_SECONDS: Final = 60 * 60
IDOKEP_WIND_CACHE_SECONDS: Final = 20 * 60
IDOKEP_FORECAST_PRIME_SECONDS: Final = 15 * 60
IDOKEP_FORECAST_RETRY_SECONDS: Final = 60
IDOKEP_FORECAST_LEAD_SECONDS: Final = 2 * 60 * 60

START_CONFIRM_SECONDS: Final = 45
STOP_CONFIRM_SECONDS: Final = 45
ZONE_GRACE_SECONDS: Final = 30
MAX_QUEUE_DELAY_SECONDS: Final = 30 * 60

DEFAULT_SETTINGS: Final = {
    "automation_enabled": True,
    "paused_until": None,
    "rain_skip_mm": 8.0,
    "rain_skip_probability": 80,
    "rain_skip_probability_mm": 2.0,
    "rainy_hours_skip": 3,
    "rain_reduce_high_mm": 4.0,
    "rain_reduce_low_mm": 1.0,
    "rain_factor_high": 0.65,
    "rain_factor_low": 0.85,
    "factor_min": 0.5,
    "factor_max": 1.5,
    "evapotranspiration_enabled": True,
    "et_reference_mm": 5.0,
    "et_crop_coefficient": 0.85,
    "water_balance_min_mm": 5.0,
    "water_balance_max_event_mm": 10.0,
    "water_balance_max_rain_credit_mm": 15.0,
    "water_balance_max_defer_windows": 2,
    "water_balance_rain_lookahead_hours": 36,
    "soil_moisture_dry_percent": 30.0,
    "soil_moisture_target_percent": 55.0,
    "soil_moisture_skip_percent": 80.0,
    "soil_moisture_max_factor": 1.2,
    "notify_mobile": True,
    "ntfy_base_url": "https://ntfy.sh",
    "ntfy_topic": "",
    "rain_station_city": "",
    "rain_station_id": "",
    "rain_station_name": "",
    "idokep_location": "",
    "wind_adjustment_enabled": True,
    "wind_delay_enabled": True,
    "wind_delay_step_minutes": 30,
    "wind_delay_until": "22:00",
    "wind_speed_threshold_spray": 25.0,
    "wind_gust_threshold_spray": 35.0,
    "wind_speed_threshold_rotator": 30.0,
    "wind_gust_threshold_rotator": 45.0,
    "wind_speed_threshold_rotor": 35.0,
    "wind_gust_threshold_rotor": 50.0,
}
