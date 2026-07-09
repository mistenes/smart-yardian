import { describe, expect, it } from "vitest";
import { soilMoisturePreview } from "./moisture";

const settings = {
  soil_moisture_dry_percent: 30,
  soil_moisture_target_percent: 55,
  soil_moisture_skip_percent: 80,
  soil_moisture_max_factor: 1.2,
};

describe("soil moisture preview", () => {
  it("skips a 94% wet zone", () => {
    expect(soilMoisturePreview("94", settings)).toEqual({
      percent: 94,
      factor: 0,
      action: "skip",
    });
  });

  it("matches the backend linear adjustment", () => {
    expect(soilMoisturePreview("67.5", settings)?.factor).toBeCloseTo(0.5);
    expect(soilMoisturePreview("43", settings)?.factor).toBeCloseTo(1.096);
    expect(soilMoisturePreview("55", settings)?.factor).toBe(1);
  });

  it("ignores invalid readings", () => {
    expect(soilMoisturePreview("unknown", settings)).toBeNull();
  });
});
