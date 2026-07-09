import type { Settings } from "./types";

export type SoilMoisturePreview = {
  percent: number;
  factor: number;
  action: "increase" | "reduce" | "normal" | "skip";
};

type SoilMoistureSettings = Pick<
  Settings,
  | "soil_moisture_dry_percent"
  | "soil_moisture_target_percent"
  | "soil_moisture_skip_percent"
  | "soil_moisture_max_factor"
>;

export const soilMoisturePreview = (
  value: unknown,
  settings: SoilMoistureSettings,
): SoilMoisturePreview | null => {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  const dry = settings.soil_moisture_dry_percent;
  const target = settings.soil_moisture_target_percent;
  const skip = settings.soil_moisture_skip_percent;
  const maxFactor = settings.soil_moisture_max_factor;
  if (percent >= skip) return { percent, factor: 0, action: "skip" };
  if (percent > target) {
    return {
      percent,
      factor: (skip - percent) / (skip - target),
      action: "reduce",
    };
  }
  if (percent < target) {
    const factor =
      percent <= dry
        ? maxFactor
        : 1 + ((target - percent) / (target - dry)) * (maxFactor - 1);
    return { percent, factor, action: "increase" };
  }
  return { percent, factor: 1, action: "normal" };
};
