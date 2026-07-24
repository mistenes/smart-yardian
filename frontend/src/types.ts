export type Hass = {
  connection: {
    sendMessagePromise<T>(message: Record<string, unknown>): Promise<T>;
  };
  states: Record<string, { state: string; attributes: Record<string, unknown> }>;
  locale?: { language: string };
  themes?: { darkMode?: boolean };
};

export type Zone = {
  entity_id: string;
  name: string;
  state: string;
  available: boolean;
  availability_issue: string | null;
  profile: ZoneProfile;
};

export type HeadType = "rotator" | "mp800" | "spray" | "rotor" | "drip";

export type ZoneProfile = {
  entity_id: string;
  head_type: HeadType;
  reference_rate_mm_h: number;
  flow_l_min: number | null;
  area_m2: number | null;
  exposure: "sunny" | "shady";
  exposure_factor: number;
  moisture_sensor_entity_id: string | null;
  moisture_sensor_state?: string;
  moisture_sensor_unit?: string | null;
  effective_rate_mm_h: number;
  rate_source: string;
};

export type Controller = {
  id: string;
  name: string;
  model: string;
  available: boolean;
  available_zone_count: number;
  zone_count: number;
  zones: Zone[];
};

export type ProgramZone = {
  entity_id: string;
  duration_minutes: number;
  duration_mode: "manual" | "reference";
};

export type ScheduleMode = "fixed" | "smart_window";
export type PlanningStatus =
  | "fixed"
  | "smart_planned"
  | "smart_waiting_forecast"
  | "smart_no_fit"
  | "smart_zone_conflict"
  | "water_balance_unavailable";

export type Program = {
  program_id: string;
  name: string;
  enabled: boolean;
  weekdays: number[];
  schedule_mode: ScheduleMode;
  start_time: string;
  window_start_time: string | null;
  window_end_time: string | null;
  weather_adjustment: boolean;
  temperature_condition_enabled: boolean;
  temperature_condition_operator: "above" | "below";
  temperature_condition_value: number;
  soil_moisture_enabled: boolean;
  zones: ProgramZone[];
  skip_next: boolean;
};

export type WeatherDecision = {
  factor: number | null;
  percent: number | null;
  source: string;
  precipitation_mm?: number;
  max_probability?: number;
  max_temperature?: number;
  sunny_hours?: number;
  rainy_hours?: number;
  rain_factor?: number;
  climate_factor?: number;
  observed_precipitation_mm?: number;
  effective_precipitation_mm?: number;
  rain_station?: string | null;
  et0_mm?: number | null;
  adjusted_et0_mm?: number | null;
  et_cloud_factor?: number;
  et_wind_factor?: number;
  average_humidity_percent?: number | null;
  et_humidity_factor?: number;
  et_reference_mm?: number;
  irrigation_target_mm?: number | null;
  max_wind_speed_kmh?: number | null;
  max_wind_gust_kmh?: number | null;
  windy_hours?: number;
  wind_action?: "none" | "warn" | "delay" | "skip";
  wind_reason?: string;
  delayed_until?: string | null;
  reason: string;
  evaluated_at?: string;
  available?: boolean;
};

export type HourlyForecastHour = {
  timestamp: string;
  temperature: number;
  precipitation_mm: number;
  precipitation_probability: number;
  humidity_percent?: number | null;
  condition: string;
  cloud_cover: number | null;
  is_daylight: boolean | null;
  wind_speed_kmh: number | null;
  wind_gust_kmh: number | null;
  wind_bearing_deg: number | null;
};

export type HourlyForecast = {
  source: "Időkép";
  generated_at: string;
  hours: HourlyForecastHour[];
};

export type RunRecord = {
  run_id: string;
  program_id: string | null;
  program_name: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  outcome: "completed" | "skipped" | "failed" | "stopped" | "interrupted";
  reason: string;
  factor: number;
  weather_source: string;
  zones: Array<Record<string, unknown>>;
  weather?: WeatherDecision | null;
};

export type ScheduleStatus =
  | "will_run"
  | "automation_off"
  | "paused"
  | "skip_next"
  | "weather_unavailable"
  | "condition_skip"
  | "rain_skip"
  | "moisture_skip"
  | "wind_delayed"
  | "wind_skip"
  | "wind_unavailable"
  | "water_need_deferred"
  | "water_balance_unavailable"
  | "smart_no_fit"
  | "smart_zone_conflict";

export type ScheduleZone = {
  entity_id: string;
  name: string;
  duration_mode: "manual" | "reference";
  planned_minutes: number | null;
  moisture_sensor_entity_id?: string | null;
  moisture_sensor_name?: string | null;
  moisture_percent?: number | null;
  moisture_factor?: number;
  moisture_action?:
    | "disabled"
    | "not_configured"
    | "unavailable"
    | "normal"
    | "increase"
    | "reduce"
    | "skip";
  moisture_reason?: string;
};

export type ScheduleProgram = {
  program_id: string;
  program_name: string;
  scheduled_at: string;
  schedule_mode?: ScheduleMode;
  planned_end_at?: string | null;
  window_start_at?: string | null;
  window_end_at?: string | null;
  planning_status?: PlanningStatus | null;
  selection_reason?: string | null;
  status: ScheduleStatus;
  reason: string;
  total_minutes: number | null;
  water_balance_before_mm?: number | null;
  daily_water_need_mm?: number | null;
  daily_effective_rain_mm?: number | null;
  daily_ledger_rain_mm?: number | null;
  forecast_rain_mm?: number | null;
  forecast_ledger_rain_mm?: number | null;
  irrigation_target_mm?: number | null;
  remaining_balance_mm?: number | null;
  water_balance_gap_days?: number | null;
  water_balance_backfilled_gap_days?: number | null;
  water_balance_unaccounted_gap_days?: number | null;
  water_balance_rebaselined_after_gap?: boolean | null;
  water_balance_last_rebaseline_date?: string | null;
  zones: ScheduleZone[];
  weather: WeatherDecision | null;
};

export type SchedulePreview = {
  generated_at: string;
  days: Array<{
    date: string;
    programs: ScheduleProgram[];
  }>;
};

export type Settings = {
  automation_enabled: boolean;
  paused_until: string | null;
  rain_skip_mm: number;
  rain_skip_probability: number;
  rain_skip_probability_mm: number;
  rainy_hours_skip: number;
  rain_reduce_high_mm: number;
  rain_reduce_low_mm: number;
  rain_factor_high: number;
  rain_factor_low: number;
  factor_min: number;
  factor_max: number;
  evapotranspiration_enabled: boolean;
  et_reference_mm: number;
  et_crop_coefficient: number;
  soil_moisture_dry_percent: number;
  soil_moisture_target_percent: number;
  soil_moisture_skip_percent: number;
  soil_moisture_max_factor: number;
  water_balance_min_mm: number;
  water_balance_max_event_mm: number;
  water_balance_max_rain_credit_mm: number;
  water_balance_max_defer_windows: number;
  water_balance_rain_lookahead_hours: number;
  notify_mobile: boolean;
  ntfy_base_url: string;
  ntfy_topic: string;
  ntfy_link: string;
  ntfy_status: {
    enabled: boolean;
    configured: boolean;
    ha_notify_service_configured: boolean;
    last_attempt_at?: string | null;
    last_accepted_at?: string | null;
    last_error?: string | null;
  };
  rain_station_city: string;
  rain_station_id: string;
  rain_station_name: string;
  idokep_location: string;
  wind_adjustment_enabled: boolean;
  wind_delay_enabled: boolean;
  wind_delay_step_minutes: number;
  wind_delay_until: string;
  wind_speed_threshold_spray: number;
  wind_gust_threshold_spray: number;
  wind_speed_threshold_rotator: number;
  wind_gust_threshold_rotator: number;
  wind_speed_threshold_rotor: number;
  wind_gust_threshold_rotor: number;
};

export type RainStation = {
  station_id: string;
  location: string;
  measured_mm: number;
  radar_mm: number;
  map_x: number;
  map_y: number;
};

export type RainObservation = RainStation & {
  fetched_at: string | null;
};

export type Summary = {
  status: string;
  automation_enabled: boolean;
  paused_until: string | null;
  controllers: Controller[];
  programs: Program[];
  history: RunRecord[];
  settings: Settings;
  active_run: ActiveRun | null;
  weather: WeatherDecision | null;
  rain_observation: RainObservation | null;
  rain_observation_error: string | null;
  last_error: string | null;
  next_run: string | null;
  next_run_plan?: {
    program_id: string;
    program_name: string;
    schedule_mode: ScheduleMode;
    scheduled_at: string;
    planned_end_at?: string | null;
    window_start_at?: string | null;
    window_end_at?: string | null;
    planning_status?: PlanningStatus | null;
    selection_reason?: string | null;
  } | null;
  seasonal_target: {
    depth_mm: number;
    cadence: string;
    label: string;
  } | null;
};

export type ActiveRunZone = {
  entity_id: string;
  name: string;
  planned_minutes: number;
  outcome: "pending" | "running" | "completed" | "skipped" | "stopped";
};

export type ActiveRun = {
  run_id: string;
  program_id: string;
  program_name: string;
  started_at: string;
  current_zone?: string;
  current_duration?: number;
  current_index?: number;
  zone_started_at?: string;
  zone_ends_at?: string;
  total_minutes: number;
  completed_minutes: number;
  zones: ActiveRunZone[];
};
