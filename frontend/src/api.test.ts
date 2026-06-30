import { describe, expect, it } from "vitest";
import {
  previewSchedule,
  runProgram,
  runZone,
  setAutomation,
  skipCurrentZone,
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

  it("updates automation and weather settings through separate commands", async () => {
    const { hass, messages } = recordingHass();
    await setAutomation(hass, false);
    await updateSettings(hass, { rain_skip_mm: 9 });
    expect(messages.map((message) => message.type)).toEqual([
      "smart_yardian/automation/set",
      "smart_yardian/settings/update",
    ]);
  });
});
