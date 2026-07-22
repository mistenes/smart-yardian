import { describe, expect, it } from "vitest";
import { createProgramId } from "./ids";
import type { Program, ScheduleProgram } from "./types";

describe("Smart Yardian program shape", () => {
  it("keeps ordered zones and weekly schedule", () => {
    const program: Program = {
      program_id: "test",
      name: "Reggeli kert",
      enabled: true,
      weekdays: [0, 2, 4],
      schedule_mode: "fixed",
      start_time: "05:30",
      window_start_time: "02:00",
      window_end_time: "07:00",
      weather_adjustment: true,
      temperature_condition_enabled: true,
      temperature_condition_operator: "above",
      temperature_condition_value: 28,
      soil_moisture_enabled: true,
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
    expect(program.schedule_mode).toBe("fixed");
    expect(program.zones.map((zone) => zone.duration_mode)).toEqual([
      "reference",
      "manual",
    ]);
  });

  it("represents an overnight intelligent watering window", () => {
    const program: Program = {
      program_id: "overnight",
      name: "Éjszakai automata",
      enabled: true,
      weekdays: [0, 2, 4],
      schedule_mode: "smart_window",
      start_time: "05:30",
      window_start_time: "22:00",
      window_end_time: "06:00",
      weather_adjustment: true,
      temperature_condition_enabled: false,
      temperature_condition_operator: "above",
      temperature_condition_value: 30,
      soil_moisture_enabled: true,
      zones: [
        {
          entity_id: "switch.gyep",
          duration_minutes: 15,
          duration_mode: "reference",
        },
      ],
      skip_next: false,
    };

    expect(program.schedule_mode).toBe("smart_window");
    expect(program.window_start_time).toBe("22:00");
    expect(program.window_end_time).toBe("06:00");
  });
});

describe("Smart Yardian program creation", () => {
  it("creates an id without requiring crypto.randomUUID", () => {
    expect(createProgramId(1_750_000_000_000, 0.5)).toMatch(
      /^program-[a-z0-9]+-[a-z0-9]{7}$/,
    );
  });
});

describe("Smart Yardian intelligent schedule preview", () => {
  it("carries the selected time and a no-fit status", () => {
    const preview: ScheduleProgram = {
      program_id: "overnight",
      program_name: "Éjszakai automata",
      scheduled_at: "2026-07-21T22:00:00+02:00",
      schedule_mode: "smart_window",
      planned_end_at: null,
      window_start_at: "2026-07-21T22:00:00+02:00",
      window_end_at: "2026-07-22T06:00:00+02:00",
      planning_status: "smart_no_fit",
      selection_reason: "A számított program nem fér bele az időablakba.",
      status: "smart_no_fit",
      reason: "Nincs megfelelő időpont.",
      total_minutes: 520,
      zones: [],
      weather: null,
    };

    expect(preview.status).toBe("smart_no_fit");
    expect(preview.window_end_at).toContain("2026-07-22");
  });

  it("represents a conflicting intelligent program explicitly", () => {
    const preview: ScheduleProgram = {
      program_id: "conflict",
      program_name: "Átfedő gyep",
      scheduled_at: "2026-07-21T02:00:00+02:00",
      schedule_mode: "smart_window",
      planned_end_at: null,
      planning_status: "smart_zone_conflict",
      status: "smart_zone_conflict",
      reason: "Egy zónát másik vízigény-alapú program is használ.",
      total_minutes: null,
      zones: [],
      weather: null,
    };

    expect(preview.planning_status).toBe("smart_zone_conflict");
    expect(preview.status).toBe("smart_zone_conflict");
  });
});
