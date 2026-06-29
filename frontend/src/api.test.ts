import { describe, expect, it } from "vitest";
import {
  runProgram,
  runZone,
  setAutomation,
  updateSettings,
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
