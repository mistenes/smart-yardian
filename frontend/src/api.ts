import type {
  Hass,
  Program,
  SchedulePreview,
  Settings,
  Summary,
  WeatherDecision,
  ZoneProfile,
} from "./types";

export const getSummary = (hass: Hass) =>
  hass.connection.sendMessagePromise<Summary>({ type: "smart_yardian/summary" });

export const previewWeather = (hass: Hass) =>
  hass.connection.sendMessagePromise<WeatherDecision>({
    type: "smart_yardian/weather/preview",
  });

export const previewSchedule = (hass: Hass) =>
  hass.connection.sendMessagePromise<SchedulePreview>({
    type: "smart_yardian/schedule/preview",
  });

export const saveProgram = (hass: Hass, program: Program) =>
  hass.connection.sendMessagePromise<Program>({
    type: "smart_yardian/program/save",
    program,
  });

export const deleteProgram = (hass: Hass, programId: string) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/program/delete",
    program_id: programId,
  });

export const updateSettings = (hass: Hass, settings: Partial<Settings>) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/settings/update",
    settings,
  });

export const updateZoneProfiles = (hass: Hass, profiles: ZoneProfile[]) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/zone_profiles/update",
    profiles,
  });

export const setAutomation = (hass: Hass, enabled: boolean) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/automation/set",
    enabled,
  });

export const runProgram = (hass: Hass, programId: string) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/run/program",
    program_id: programId,
    apply_weather: true,
  });

export const runZone = (
  hass: Hass,
  entityId: string,
  durationMinutes: number,
) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/run/zone",
    entity_id: entityId,
    duration_minutes: durationMinutes,
  });

export const stopAll = (hass: Hass) =>
  hass.connection.sendMessagePromise<void>({ type: "smart_yardian/run/stop" });

export const skipCurrentZone = (hass: Hass) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/run/skip_current_zone",
  });

export const skipNext = (hass: Hass, programId: string) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/program/skip_next",
    program_id: programId,
  });

export const pauseUntil = (hass: Hass, until: string | null) =>
  hass.connection.sendMessagePromise<void>({
    type: "smart_yardian/pause_until",
    until,
  });
