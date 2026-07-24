import { describe, expect, it } from "vitest";
import {
  getHourlyForecast,
  previewSchedule,
  runManualProgram,
  runProgram,
  runZone,
  saveAndRunProgram,
  searchRainStations,
  setAutomation,
  skipCurrentZone,
  testNtfy,
  updateSettings,
  updateZoneProfiles,
} from "./api";
import type { Hass } from "./types";

const recordingHass = () => {
  const messages: Array<Record<string, unknown>> = [];
  const hass: Hass = {
    states: {},
    connection: {
      async sendMessagePromise<T>(message: Record<string, unknown>): Promise<T> {
        messages.push(message);
        return undefined as T;
      },
    },
  };
  return { hass, messages };
};

describe("Smart Yardian WebSocket client", () => {
  it("sends an exact manual zone duration", async () => {
    const { hass, messages } = recordingHass();
    await runZone(hass, "switch.gyep", 18);
    expect(messages).toEqual([
      {
        type: "smart_yardian/run/zone",
        entity_id: "switch.gyep",
        duration_minutes: 18,
      },
    ]);
  });

  it("requests the calculated three-day schedule", async () => {
    const { hass, messages } = recordingHass();
    await previewSchedule(hass);
    expect(messages[0]).toEqual({
      type: "smart_yardian/schedule/preview",
    });
  });

  it("requests the normalized Időkép hourly forecast", async () => {
    const { hass, messages } = recordingHass();
    await getHourlyForecast(hass);
    expect(messages[0]).toEqual({
      type: "smart_yardian/weather/hourly",
    });
  });

  it("searches Időkép rain stations by settlement", async () => {
    const { hass, messages } = recordingHass();
    await searchRainStations(hass, "Csömör");
    expect(messages[0]).toEqual({
      type: "smart_yardian/rain/stations",
      city: "Csömör",
    });
  });

  it("skips only the current running zone", async () => {
    const { hass, messages } = recordingHass();
    await skipCurrentZone(hass);
    expect(messages[0]).toEqual({
      type: "smart_yardian/run/skip_current_zone",
    });
  });

  it("updates hydraulic zone profiles", async () => {
    const { hass, messages } = recordingHass();
    await updateZoneProfiles(hass, [
      {
        entity_id: "switch.gyep",
        head_type: "rotator",
        reference_rate_mm_h: 10,
        flow_l_min: 20,
        area_m2: 100,
        exposure: "sunny",
        exposure_factor: 1,
        moisture_sensor_entity_id: "sensor.kert_talajnedvesseg",
        effective_rate_mm_h: 12,
        rate_source: "vízhozam és terület",
      },
    ]);
    expect(messages[0]).toMatchObject({
      type: "smart_yardian/zone_profiles/update",
      profiles: [{ entity_id: "switch.gyep", head_type: "rotator" }],
    });
  });

  it("runs a program with weather adjustment", async () => {
    const { hass, messages } = recordingHass();
    await runProgram(hass, "morning");
    expect(messages[0]).toMatchObject({
      type: "smart_yardian/run/program",
      program_id: "morning",
      apply_weather: true,
    });
  });

  it("saves every edited zone before running a conditional program", async () => {
    const messages: Array<Record<string, unknown>> = [];
    const program = {
      program_id: "hot-day",
      name: "Forró nap",
      enabled: true,
      weekdays: [0],
      schedule_mode: "smart_window" as const,
      start_time: "12:00",
      window_start_time: "02:00",
      window_end_time: "07:00",
      weather_adjustment: true,
      temperature_condition_enabled: true,
      temperature_condition_operator: "above" as const,
      temperature_condition_value: 30,
      soil_moisture_enabled: false,
      zones: [
        {
          entity_id: "switch.elso",
          duration_minutes: 10,
          duration_mode: "manual" as const,
        },
        {
          entity_id: "switch.masodik",
          duration_minutes: 15,
          duration_mode: "manual" as const,
        },
      ],
      skip_next: false,
    };
    const hass: Hass = {
      states: {},
      connection: {
        async sendMessagePromise<T>(
          message: Record<string, unknown>,
        ): Promise<T> {
          messages.push(message);
          return (message.type === "smart_yardian/program/save"
            ? program
            : undefined) as T;
        },
      },
    };

    await saveAndRunProgram(hass, program);

    expect(messages).toEqual([
      { type: "smart_yardian/program/save", program },
      {
        type: "smart_yardian/run/program",
        program_id: "hot-day",
        apply_weather: true,
      },
    ]);
  });

  it("runs an ephemeral multi-zone manual program", async () => {
    const { hass, messages } = recordingHass();
    const program = {
      program_id: "manual",
      name: "Kézi program",
      enabled: false,
      weekdays: [0],
      schedule_mode: "fixed" as const,
      start_time: "12:00",
      window_start_time: "02:00",
      window_end_time: "07:00",
      weather_adjustment: false,
      temperature_condition_enabled: false,
      temperature_condition_operator: "above" as const,
      temperature_condition_value: 30,
      soil_moisture_enabled: false,
      zones: [
        {
          entity_id: "switch.gyep",
          duration_minutes: 10,
          duration_mode: "manual" as const,
        },
      ],
      skip_next: false,
    };
    await runManualProgram(hass, program, false);
    expect(messages[0]).toMatchObject({
      type: "smart_yardian/run/manual_program",
      program,
      apply_weather: false,
    });
  });

  it("updates automation and weather settings through separate commands", async () => {
    const { hass, messages } = recordingHass();
    await setAutomation(hass, false);
    await updateSettings(hass, { rain_skip_mm: 9 });
    expect(messages.map((message) => message.type)).toEqual([
      "smart_yardian/automation/set",
      "smart_yardian/settings/update",
    ]);
  });

  it("requests one direct ntfy test notification", async () => {
    const { hass, messages } = recordingHass();
    await testNtfy(hass);
    expect(messages[0]).toEqual({
      type: "smart_yardian/notifications/test",
    });
  });
});
