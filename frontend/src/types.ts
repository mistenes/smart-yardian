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
};

export type Controller = {
  id: string;
  name: string;
  model: string;
  available: boolean;
  zones: Zone[];
};

export type ProgramZone = {
  entity_id: string;
  duration_minutes: number;
};

export type Program = {
  program_id: string;
  name: string;
  enabled: boolean;
  weekdays: number[];
  start_time: string;
  weather_adjustment: boolean;
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
  reason: string;
  evaluated_at?: string;
  available?: boolean;
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
  notify_mobile: boolean;
};

export type Summary = {
  status: string;
  automation_enabled: boolean;
  paused_until: string | null;
  controllers: Controller[];
  programs: Program[];
  history: RunRecord[];
  settings: Settings;
  active_run: Record<string, unknown> | null;
  weather: WeatherDecision | null;
  last_error: string | null;
  next_run: string | null;
};
