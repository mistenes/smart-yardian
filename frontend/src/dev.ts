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
  mdiWeatherPartlyCloudy,
  mdiWeatherRainy,
  mdiWeatherSunsetUp,
  mdiWhiteBalanceSunny,
} from "@mdi/js";
import type {
  Hass,
  Program,
  RunRecord,
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
  "mdi:weather-partly-cloudy": mdiWeatherPartlyCloudy,
  "mdi:weather-rainy": mdiWeatherRainy,
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
    zones: [],
  },
];

let automationEnabled = true;
let runningEntity: string = zones[3]?.[0] ?? "";

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
      available: true,
      zones: zones.slice(0, 5).map(([entity_id, name]) => ({
        entity_id,
        name,
        state: entity_id === runningEntity ? "on" : "off",
        available: true,
        profile: zoneProfiles.get(entity_id)!,
      })),
    },
    {
      id: "back",
      name: "Hátsó kert",
      model: "Yardian Pro 2.0",
      available: true,
      zones: zones.slice(5).map(([entity_id, name]) => ({
        entity_id,
        name,
        state: entity_id === runningEntity ? "on" : "off",
        available: true,
        profile: zoneProfiles.get(entity_id)!,
      })),
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
        program_name: "Reggeli kert",
        current_zone: runningEntity,
        current_duration: 20,
        zone_started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
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

const hass: Hass = {
  states: {},
  connection: {
    async sendMessagePromise<T>(message: Record<string, unknown>): Promise<T> {
      const type = message.type;
      if (type === "smart_yardian/summary") return summary() as T;
      if (type === "smart_yardian/weather/preview") return summary().weather as T;
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
      if (type === "smart_yardian/run/zone") runningEntity = String(message.entity_id);
      if (type === "smart_yardian/run/stop") runningEntity = "";
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      return undefined as T;
    },
  },
};

const panel = document.createElement("smart-yardian-panel");
panel.hass = hass;
document.body.append(panel);
