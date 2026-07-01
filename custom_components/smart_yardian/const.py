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
PANEL_MODULE_URL: Final = "/smart_yardian/smart-yardian-panel.js"

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

START_CONFIRM_SECONDS: Final = 15
STOP_CONFIRM_SECONDS: Final = 15
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
    "notify_mobile": True,
}
