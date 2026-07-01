import "./panel";
import {
  mdiCheck,
  mdiChevronDown,
  mdiChevronUp,
  mdiClockOutline,
  mdiClose,
  mdiPause,
  mdiPlay,
  mdiPlus,
  mdiSprinklerVariant,
  mdiStop,
  mdiThermometer,
  mdiWater,
  mdiWaterPercent,
  mdiWeatherNight,
  mdiWeatherCloudy,
  mdiWeatherPartlyCloudy,
  mdiWeatherRainy,
  mdiWeatherSunny,
  mdiWeatherSunsetUp,
  mdiWhiteBalanceSunny,
} from "@mdi/js";
import type {
  Hass,
  HourlyForecast,
  Program,
  RunRecord,
  SchedulePreview,
  Summary,
  ZoneProfile,
} from "./types";

const iconPaths: Record<string, string> = {
  "mdi:check": mdiCheck,
  "mdi:chevron-down": mdiChevronDown,
  "mdi:chevron-up": mdiChevronUp,
  "mdi:clock-outline": mdiClockOutline,
  "mdi:close": mdiClose,
  "mdi:pause": mdiPause,
  "mdi:play": mdiPlay,
  "mdi:plus": mdiPlus,
  "mdi:sprinkler-variant": mdiSprinklerVariant,
  "mdi:stop": mdiStop,
  "mdi:thermometer": mdiThermometer,
  "mdi:water": mdiWater,
  "mdi:water-percent": mdiWaterPercent,
  "mdi:weather-night": mdiWeatherNight,
  "mdi:weather-cloudy": mdiWeatherCloudy,
  "mdi:weather-partly-cloudy": mdiWeatherPartlyCloudy,
  "mdi:weather-rainy": mdiWeatherRainy,
  "mdi:weather-sunny": mdiWeatherSunny,
  "mdi:weather-sunset-up": mdiWeatherSunsetUp,
  "mdi:white-balance-sunny": mdiWhiteBalanceSunny,
};

class DevHaIcon extends HTMLElement {
  private pending = false;

  static get observedAttributes(): string[] {
    return ["icon"];
  }

  connectedCallback(): void {
    this.scheduleRender();
  }

  attributeChangedCallback(): void {
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      this.renderIcon();
    });
  }

  private renderIcon(): void {
    const path = iconPaths[this.getAttribute("icon") ?? ""] ?? mdiWater;
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host { display: inline-block; width: var(--mdc-icon-size, 24px); height: var(--mdc-icon-size, 24px); }
        svg { display: block; width: 100%; height: 100%; }
      </style>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${path}"></path></svg>
    `;
  }
}

if (!customElements.get("ha-icon")) {
  customElements.define("ha-icon", DevHaIcon);
}

const zones = [
  ["switch.yardian_1_gyep_eleje", "Gyep eleje"],
  ["switch.yardian_1_gyep_oldala", "Gyep oldala"],
  ["switch.yardian_1_soveny", "Sövény"],
  ["switch.yardian_1_vetemenyes", "Veteményes"],
  ["switch.yardian_1_viragagyas", "Virágágyás"],
  ["switch.yardian_2_hatso_gyep", "Hátsó gyep"],
  ["switch.yardian_2_fak", "Fák"],
  ["switch.yardian_2_teraszagyas", "Teraszágyás"],
  ["switch.yardian_2_kapubejaro", "Kapubejáró"],
] as const;

const profileFor = (entityId: string, index: number): ZoneProfile => {
  const head_type = index === 2 || index === 4 ? "drip" : index % 3 === 0 ? "rotor" : "rotator";
  const reference_rate_mm_h = head_type === "rotator" ? 10 : 12;
  return {
    entity_id: entityId,
    head_type,
    reference_rate_mm_h,
    flow_l_min: null,
    area_m2: null,
    exposure: index % 4 === 0 ? "shady" : "sunny",
    exposure_factor: index % 4 === 0 ? 0.8 : 1,
    moisture_sensor_entity_id:
      index < 2 ? "sensor.elso_kert_talajnedvesseg" : null,
    moisture_sensor_state: index < 2 ? "43" : undefined,
    moisture_sensor_unit: index < 2 ? "%" : undefined,
    effective_rate_mm_h: reference_rate_mm_h,
    rate_source: "fejtípus referencia",
  };
};

const zoneProfiles = new Map<string, ZoneProfile>(
  zones.map(([entityId], index) => [entityId, profileFor(entityId, index)]),
);

let programs: Program[] = [
  {
    program_id: "morning",
    name: "Reggeli kert",
    enabled: true,
    weekdays: [0, 1, 2, 3, 4],
    start_time: "05:30",
    weather_adjustment: true,
    temperature_condition_enabled: true,
    temperature_condition_operator: "above",
    temperature_condition_value: 26,
    soil_moisture_enabled: true,
    zones: zones.slice(0, 5).map(([entity_id], index) => ({
      entity_id,
      duration_minutes: [15, 15, 20, 20, 10][index] ?? 15,
      duration_mode: index < 2 ? "reference" : "manual",
    })),
    skip_next: false,
  },
  {
    program_id: "evening",
    name: "Esti csepegtetés",
    enabled: true,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    start_time: "20:00",
    weather_adjustment: true,
    temperature_condition_enabled: false,
    temperature_condition_operator: "above",
    temperature_condition_value: 30,
    soil_moisture_enabled: false,
    zones: zones.slice(5).map(([entity_id], index) => ({
      entity_id,
      duration_minutes: [18, 30, 12, 8][index] ?? 15,
      duration_mode: "reference",
    })),
    skip_next: false,
  },
];

const history: RunRecord[] = [
  {
    run_id: "history-1",
    program_id: "morning",
    program_name: "Reggeli kert",
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    started_at: null,
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    outcome: "skipped",
    reason: "Eső miatt kihagyva.",
    factor: 0,
    weather_source: "Időkép",
    weather: {
      factor: 0,
      percent: 0,
      source: "Időkép",
      precipitation_mm: 5.8,
      max_probability: 88,
      max_temperature: 31,
      sunny_hours: 3.2,
      rainy_hours: 4,
      reason: "A várható csapadék elegendő, ezért a program kimarad.",
      evaluated_at: new Date(Date.now() - 86400000).toISOString(),
    },
    zones: [],
  },
];

let automationEnabled = true;
const forceUnavailable =
  new URLSearchParams(window.location.search).get("yardian_state") === "unavailable";
const forceIdle = new URLSearchParams(window.location.search).get("idle") === "1";
const forceDark = new URLSearchParams(window.location.search).get("dark") === "1";
if (forceDark) {
  const root = document.documentElement.style;
  root.setProperty("--primary-color", "#5eb2ff");
  root.setProperty("--success-color", "#67c970");
  root.setProperty("--warning-color", "#f6ad36");
  root.setProperty("--error-color", "#ff6b6b");
  root.setProperty("--primary-text-color", "#e8eaed");
  root.setProperty("--text-primary-color", "#07131f");
  root.setProperty("--secondary-text-color", "#a9b0b8");
  root.setProperty("--disabled-text-color", "#747b83");
  root.setProperty("--divider-color", "#3b4148");
  root.setProperty("--card-background-color", "#202428");
  root.setProperty("--primary-background-color", "#111418");
  root.setProperty("--secondary-background-color", "#292e33");
  root.setProperty("--input-fill-color", "#292e33");
}
let runningEntity: string =
  forceUnavailable || forceIdle ? "" : (zones[3]?.[0] ?? "");
const runningIndex = (): number =>
  Math.max(0, zones.findIndex(([entityId]) => entityId === runningEntity));

const nextRun = (): string => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(5, 30, 0, 0);
  return next.toISOString();
};

const summary = (): Summary => ({
  status: runningEntity ? "running" : "idle",
  automation_enabled: automationEnabled,
  paused_until: null,
  controllers: [
    {
      id: "front",
      name: "Első kert",
      model: "Yardian Pro 2.0",
      available: !forceUnavailable,
      available_zone_count: forceUnavailable ? 0 : 5,
      zone_count: 5,
      zones: zones.slice(0, 5).map(([entity_id, name]) => {
        const available = !forceUnavailable;
        return {
          entity_id,
          name,
          state: available ? (entity_id === runningEntity ? "on" : "off") : "unavailable",
          available,
          availability_issue: available
            ? null
            : `A natív Yardian switch unavailable állapotban van: ${entity_id}`,
          profile: zoneProfiles.get(entity_id)!,
        };
      }),
    },
    {
      id: "back",
      name: "Hátsó kert",
      model: "Yardian Pro 2.0",
      available: !forceUnavailable,
      available_zone_count: forceUnavailable ? 0 : 4,
      zone_count: 4,
      zones: zones.slice(5).map(([entity_id, name]) => {
        const available = !forceUnavailable;
        return {
          entity_id,
          name,
          state: available ? (entity_id === runningEntity ? "on" : "off") : "unavailable",
          available,
          availability_issue: available
            ? null
            : `A natív Yardian switch unavailable állapotban van: ${entity_id}`,
          profile: zoneProfiles.get(entity_id)!,
        };
      }),
    },
  ],
  programs,
  history,
  settings: {
    automation_enabled: automationEnabled,
    paused_until: null,
    rain_skip_mm: 8,
    rain_skip_probability: 80,
    rain_skip_probability_mm: 2,
    rainy_hours_skip: 3,
    rain_reduce_high_mm: 4,
    rain_reduce_low_mm: 1,
    rain_factor_high: 0.65,
    rain_factor_low: 0.85,
    factor_min: 0.5,
    factor_max: 1.5,
    notify_mobile: true,
  },
  active_run: runningEntity
    ? {
        run_id: "dev-run",
        program_id: "morning",
        program_name: "Reggeli kert",
        started_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        current_zone: runningEntity,
        current_duration: 20,
        current_index: runningIndex(),
        zone_started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        zone_ends_at: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
        total_minutes: 72,
        completed_minutes: 32,
        zones: zones.slice(0, 5).map(([entity_id, name], index) => ({
          entity_id,
          name,
          planned_minutes: [12, 10, 10, 20, 20][index] ?? 15,
          outcome:
            index < runningIndex()
              ? "completed"
              : index === runningIndex()
                ? "running"
                : "pending",
        })),
      }
    : null,
  weather: {
    factor: 0.8,
    percent: 80,
    source: "Időkép",
    precipitation_mm: 1.2,
    max_probability: 35,
    max_temperature: 29,
    sunny_hours: 7,
    rainy_hours: 1,
    rain_factor: 0.85,
    climate_factor: 1.1,
    reason: "Kevés csapadék, meleg és többnyire napos.",
    evaluated_at: new Date().toISOString(),
  },
  last_error: null,
  next_run: nextRun(),
  seasonal_target: {
    depth_mm: 5.5,
    cadence: "kétnaponta",
    label: "Nyár",
  },
});

const schedulePreview = (): SchedulePreview => {
  const morning = programs[0]!;
  const evening = programs[1]!;
  const dateAt = (offset: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const dateKey = (offset: number): string => {
    const date = dateAt(offset);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  };
  const occurrence = (offset: number, hour: number, minute: number): string => {
    const date = dateAt(offset);
    date.setHours(hour, minute);
    return date.toISOString();
  };
  const plannedZones = (program: Program) =>
    program.zones.map((zone, index) => {
      const details = zones.find(([entityId]) => entityId === zone.entity_id);
      return {
        entity_id: zone.entity_id,
        name: details?.[1] ?? zone.entity_id,
        duration_mode: zone.duration_mode,
        planned_minutes: [23, 28, 16, 16, 8, 24, 46, 18, 12][index] ?? 15,
      };
    });
  const weather = summary().weather!;
  return {
    generated_at: new Date().toISOString(),
    days: [
      {
        date: dateKey(0),
        programs: [
          {
            program_id: morning.program_id,
            program_name: morning.name,
            scheduled_at: occurrence(0, 5, 30),
            status: "will_run",
            reason: "A jelenlegi számítás szerint a program lefut.",
            total_minutes: 91,
            zones: plannedZones(morning),
            weather,
          },
          {
            program_id: evening.program_id,
            program_name: evening.name,
            scheduled_at: occurrence(0, 20, 0),
            status: "will_run",
            reason: "A jelenlegi számítás szerint a program lefut.",
            total_minutes: 100,
            zones: plannedZones(evening),
            weather,
          },
        ],
      },
      {
        date: dateKey(1),
        programs: [
          {
            program_id: morning.program_id,
            program_name: morning.name,
            scheduled_at: occurrence(1, 5, 30),
            status: "condition_skip",
            reason:
              "A program napjának maximuma 24 °C, ami nem magasabb 26 °C-nál.",
            total_minutes: 70,
            zones: plannedZones(morning),
            weather: { ...weather, max_temperature: 24, factor: 0.9, percent: 90 },
          },
        ],
      },
      {
        date: dateKey(2),
        programs: [
          {
            program_id: evening.program_id,
            program_name: evening.name,
            scheduled_at: occurrence(2, 20, 0),
            status: "weather_unavailable",
            reason: "Nincs használható Időkép-előrejelzés erre a napra.",
            total_minutes: null,
            zones: plannedZones(evening).map((zone) => ({
              ...zone,
              planned_minutes: null,
            })),
            weather: null,
          },
        ],
      },
    ],
  };
};

const hourlyForecast = (): HourlyForecast => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const hours = Array.from({ length: 36 }, (_, index) => {
    const timestamp = new Date(start);
    timestamp.setHours(start.getHours() + index);
    const localHour = timestamp.getHours();
    const rainy = index >= 8 && index <= 10;
    const night = localHour < 6 || localHour >= 21;
    return {
      timestamp: timestamp.toISOString(),
      temperature: Math.round((24 + Math.sin(index / 4) * 7) * 10) / 10,
      precipitation_mm: rainy ? [0.4, 1.2, 0.7][index - 8] ?? 0 : 0,
      precipitation_probability: rainy ? [45, 82, 60][index - 8] ?? 0 : 5,
      condition: rainy
        ? "rainy"
        : night
          ? "clear-night"
          : index % 4 === 0
            ? "partlycloudy"
            : "sunny",
      cloud_cover: rainy ? 85 : index % 4 === 0 ? 45 : 12,
      is_daylight: !night,
    };
  });
  return {
    source: "Időkép",
    generated_at: new Date().toISOString(),
    hours,
  };
};

const hass: Hass = {
  themes: { darkMode: forceDark },
  states: {
    "sensor.elso_kert_talajnedvesseg": {
      state: "43",
      attributes: {
        friendly_name: "Első kert talajnedvesség",
        device_class: "moisture",
        unit_of_measurement: "%",
      },
    },
    "sensor.hatso_kert_talajnedvesseg": {
      state: "57",
      attributes: {
        friendly_name: "Hátsó kert talajnedvesség",
        device_class: "moisture",
        unit_of_measurement: "%",
      },
    },
  },
  connection: {
    async sendMessagePromise<T>(message: Record<string, unknown>): Promise<T> {
      const type = message.type;
      if (type === "smart_yardian/summary") return summary() as T;
      if (type === "smart_yardian/weather/preview") return summary().weather as T;
      if (type === "smart_yardian/weather/hourly") return hourlyForecast() as T;
      if (type === "smart_yardian/schedule/preview") return schedulePreview() as T;
      if (type === "smart_yardian/automation/set") {
        automationEnabled = Boolean(message.enabled);
      }
      if (type === "smart_yardian/program/save") {
        const program = message.program as Program;
        const index = programs.findIndex((item) => item.program_id === program.program_id);
        if (index >= 0) programs[index] = program;
        else programs = [...programs, program];
        return program as T;
      }
      if (type === "smart_yardian/program/delete") {
        programs = programs.filter((item) => item.program_id !== message.program_id);
      }
      if (type === "smart_yardian/zone_profiles/update") {
        const profiles = message.profiles as ZoneProfile[];
        for (const profile of profiles) {
          zoneProfiles.set(profile.entity_id, profile);
        }
      }
      if (type === "smart_yardian/run/program") {
        const program = programs.find(
          (item) => item.program_id === message.program_id,
        );
        runningEntity = program?.zones[0]?.entity_id ?? "";
      }
      if (type === "smart_yardian/run/zone") runningEntity = String(message.entity_id);
      if (type === "smart_yardian/run/manual_program") {
        const program = message.program as Program;
        runningEntity = program.zones[0]?.entity_id ?? "";
      }
      if (type === "smart_yardian/run/skip_current_zone") {
        runningEntity = zones[4]?.[0] ?? "";
      }
      if (type === "smart_yardian/run/stop") runningEntity = "";
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      return undefined as T;
    },
  },
};

const panel = document.createElement("smart-yardian-panel");
panel.hass = hass;
document.body.append(panel);
