import { describe, expect, it } from "vitest";
import type { Program } from "./types";

describe("Smart Yardian program shape", () => {
  it("keeps ordered zones and weekly schedule", () => {
    const program: Program = {
      program_id: "test",
      name: "Reggeli kert",
      enabled: true,
      weekdays: [0, 2, 4],
      start_time: "05:30",
      weather_adjustment: true,
      temperature_condition_enabled: true,
      temperature_condition_operator: "above",
      temperature_condition_value: 28,
      zones: [
        {
          entity_id: "switch.gyep",
          duration_minutes: 15,
          duration_mode: "reference",
        },
        {
          entity_id: "switch.soveny",
          duration_minutes: 20,
          duration_mode: "manual",
        },
      ],
      skip_next: false,
    };
    expect(program.zones.map((zone) => zone.entity_id)).toEqual([
      "switch.gyep",
      "switch.soveny",
    ]);
    expect(program.weekdays).toEqual([0, 2, 4]);
    expect(program.temperature_condition_value).toBe(28);
    expect(program.zones.map((zone) => zone.duration_mode)).toEqual([
      "reference",
      "manual",
    ]);
  });
});
