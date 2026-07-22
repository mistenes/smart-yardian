import { LitElement, html, nothing, type TemplateResult } from "lit";
import {
  deleteProgram,
  getHourlyForecast,
  getSummary,
  pauseUntil,
  previewSchedule,
  previewWeather,
  runManualProgram,
  runZone,
  saveAndRunProgram,
  saveProgram,
  searchRainStations,
  setAutomation,
  skipCurrentZone,
  stopAll,
  updateSettings,
  updateZoneProfiles,
} from "./api";
import { createProgramId } from "./ids";
import { soilMoisturePreview, type SoilMoisturePreview } from "./moisture";
import { panelStyles } from "./styles";
import type {
  Hass,
  HourlyForecast,
  HourlyForecastHour,
  Program,
  ProgramZone,
  RainStation,
  RunRecord,
  SchedulePreview,
  ScheduleProgram,
  Settings,
  Summary,
  WeatherDecision,
  Zone,
  ZoneProfile,
} from "./types";

type Tab =
  | "overview"
  | "forecast"
  | "schedule"
  | "programs"
  | "manual"
  | "history"
  | "settings";

const DAY_NAMES = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const DAY_LONG = ["Hé", "Ke", "Sze", "Csü", "Pén", "Szo", "Vas"];
const DEFAULT_WINDOW_START = "02:00";
const DEFAULT_WINDOW_END = "07:00";
const MIN_WINDOW_MINUTES = 30;
const MAX_WINDOW_MINUTES = 18 * 60;
const HEAD_TYPES: Array<{
  value: ZoneProfile["head_type"];
  label: string;
  rate: number;
}> = [
  { value: "rotator", label: "Rotátor (MP)", rate: 10 },
  { value: "mp800", label: "Rotátor MP800", rate: 20 },
  { value: "spray", label: "Spray / esőztető", rate: 40 },
  { value: "rotor", label: "Rotoros", rate: 12 },
  { value: "drip", label: "Csepegtető", rate: 12 },
];

const emptyProgram = (): Program => ({
  program_id: createProgramId(),
  name: "Új program",
  enabled: true,
  weekdays: [0, 2, 4],
  schedule_mode: "smart_window",
  start_time: "05:30",
  window_start_time: DEFAULT_WINDOW_START,
  window_end_time: DEFAULT_WINDOW_END,
  weather_adjustment: true,
  temperature_condition_enabled: false,
  temperature_condition_operator: "above",
  temperature_condition_value: 30,
  soil_moisture_enabled: false,
  zones: [],
  skip_next: false,
});

const normalizeProgram = (program: Program): Program => ({
  ...program,
  schedule_mode: program.schedule_mode ?? "fixed",
  start_time: program.start_time ?? "05:30",
  window_start_time: program.window_start_time ?? DEFAULT_WINDOW_START,
  window_end_time: program.window_end_time ?? DEFAULT_WINDOW_END,
});

const cloneProgram = (program: Program): Program =>
  normalizeProgram(JSON.parse(JSON.stringify(program)) as Program);

const emptyManualProgram = (): Program => {
  const now = new Date();
  return {
    ...emptyProgram(),
    name: "Kézi öntözés",
    weekdays: [now.getDay() === 0 ? 6 : now.getDay() - 1],
    start_time: `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`,
    schedule_mode: "fixed",
    enabled: false,
    weather_adjustment: false,
  };
};

export class SmartYardianPanel extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    panel: { attribute: false },
    _summary: { state: true },
    _tab: { state: true },
    _loading: { state: true },
    _error: { state: true },
    _draft: { state: true },
    _saving: { state: true },
    _zoneDurations: { state: true },
    _expandedControllers: { state: true },
    _schedulePreview: { state: true },
    _scheduleLoading: { state: true },
    _hourlyForecast: { state: true },
    _forecastLoading: { state: true },
    _bulkMoistureSensor: { state: true },
    _settingsSaving: { state: true },
    _settingsSaved: { state: true },
    _ntfyCopied: { state: true },
    _rainStationSearching: { state: true },
    _rainStationMatches: { state: true },
    _runExpanded: { state: true },
    _now: { state: true },
    _manualDraft: { state: true },
    _manualRunning: { state: true },
  };

  static styles = panelStyles;

  hass?: Hass;
  narrow = false;
  panel?: unknown;
  private _summary: Summary | null = null;
  private _tab: Tab = "overview";
  private _loading = true;
  private _error = "";
  private _draft: Program | null = null;
  private _saving = false;
  private _zoneDurations: Record<string, number> = {};
  private _expandedControllers: string[] = [];
  private _schedulePreview: SchedulePreview | null = null;
  private _scheduleLoading = false;
  private _hourlyForecast: HourlyForecast | null = null;
  private _forecastLoading = false;
  private _bulkMoistureSensor = "";
  private _settingsSaving = false;
  private _settingsSaved = false;
  private _ntfyCopied = false;
  private _rainStationSearching = false;
  private _rainStationMatches: RainStation[] = [];
  private _runExpanded = false;
  private _now = Date.now();
  private _manualDraft: Program = emptyManualProgram();
  private _manualRunning = false;
  private _timer?: number;
  private _clockTimer?: number;

  connectedCallback(): void {
    super.connectedCallback();
    void this._load(true);
    this._timer = window.setInterval(() => {
      if (
        this._tab !== "settings" &&
        this._tab !== "schedule" &&
        this._tab !== "forecast"
      ) {
        void this._load(false);
      }
    }, 5000);
    this._clockTimer = window.setInterval(() => {
      this._now = Date.now();
    }, 1000);
  }

  disconnectedCallback(): void {
    if (this._timer) window.clearInterval(this._timer);
    if (this._clockTimer) window.clearInterval(this._clockTimer);
    super.disconnectedCallback();
  }

  protected render(): TemplateResult {
    return html`
      <div class="shell" ?dark=${this.hass?.themes?.darkMode}>
        <header class="topbar">
          <ha-icon icon="mdi:water"></ha-icon>
          <h1>Öntözés</h1>
        </header>
        <nav class="tabs" aria-label="Öntözés nézetek">
          ${this._tabButton("overview", "Áttekintés")}
          ${this._tabButton("forecast", "Órás előrejelzés")}
          ${this._tabButton("schedule", "Következő 3 nap")}
          ${this._tabButton("programs", "Programok")}
          ${this._tabButton("manual", "Kézi program")}
          ${this._tabButton("history", "Előzmények")}
          ${this._tabButton("settings", "Beállítások")}
        </nav>
        <main class="content">
          ${this._loading && !this._summary
            ? html`<div class="loading">Az öntözésvezérlő betöltése…</div>`
            : this._error && !this._summary
              ? html`<div class="error">${this._error}</div>`
              : this._renderTab()}
        </main>
        ${this._summary?.active_run ? this._renderActiveRun() : nothing}
      </div>
    `;
  }

  private _tabButton(tab: Tab, label: string): TemplateResult {
    return html`
      <button
        class="tab"
        ?selected=${this._tab === tab}
        aria-current=${this._tab === tab ? "page" : nothing}
        @click=${() => {
          this._tab = tab;
          if (tab === "programs" && !this._draft) this._selectFirstProgram();
          if (tab === "schedule") void this._loadSchedule();
          if (tab === "forecast") void this._loadHourlyForecast();
        }}
      >
        ${label}
      </button>
    `;
  }

  private _renderTab(): TemplateResult {
    if (!this._summary) return html``;
    switch (this._tab) {
      case "programs":
        return this._renderPrograms();
      case "schedule":
        return this._renderSchedule();
      case "forecast":
        return this._renderHourlyForecast();
      case "manual":
        return this._renderManualProgram();
      case "history":
        return this._renderHistory();
      case "settings":
        return this._renderSettings();
      default:
        return this._renderOverview();
    }
  }

  private _renderOverview(): TemplateResult {
    const summary = this._summary!;
    const weather = summary.weather;
    const enabled = summary.automation_enabled;
    const nextRunAt = summary.next_run_plan?.scheduled_at ?? summary.next_run;
    return html`
      <section class="automation">
        <div class="automation-icon" ?off=${!enabled}>
          <ha-icon icon=${enabled ? "mdi:check" : "mdi:pause"}></ha-icon>
        </div>
        <div class="automation-copy">
          <div class="automation-title" ?off=${!enabled}>
            ${enabled ? "Automatika aktív" : "Automatika kikapcsolva"}
          </div>
          <div class="subtle">
            ${enabled
              ? "Az öntözés az időjárás figyelembevételével történik."
              : "Az ütemezett programok nem indulnak el."}
          </div>
        </div>
        <button
          class="toggle"
          ?on=${enabled}
          aria-label=${enabled ? "Automatika kikapcsolása" : "Automatika bekapcsolása"}
          @click=${this._toggleAutomation}
        ></button>
      </section>

      ${this._renderWeather(weather)}

      <div class="next-run">
        <ha-icon icon="mdi:clock-outline"></ha-icon>
        ${nextRunAt
          ? html`
              <span>Következő:</span>
              <span class="linklike">${this._nextProgramName()}</span>
              <span>
                · ${this._formatRelative(nextRunAt)}${summary.next_run_plan?.planned_end_at
                  ? `–${this._formatTime(summary.next_run_plan.planned_end_at)}`
                  : ""}
              </span>
            `
          : html`<span>Nincs következő engedélyezett program</span>`}
      </div>

      <div class="overview-grid">
        <div class="controllers">
          ${summary.controllers.length
            ? summary.controllers.map((controller) => this._renderController(controller))
            : html`<div class="empty">Nincs konfigurált Yardian zóna.</div>`}
        </div>
        <aside class="rail">
          <div class="rail-title">
            <span>Programok</span>
            <button class="text-action" type="button" @click=${this._newProgram}>
              + Hozzáadás
            </button>
          </div>
          ${summary.programs.length
            ? summary.programs
                .slice(0, 3)
                .map((program) => this._renderRailProgram(program))
            : html`<div class="empty">Még nincs program.</div>`}
          ${this._renderCompactHistory(summary.history[0])}
        </aside>
      </div>

      ${summary.active_run
        ? nothing
        : html`
            <button class="button danger stop-all" @click=${this._stopAll}>
              <ha-icon icon="mdi:stop"></ha-icon>
              Minden leállítása
            </button>
          `}
    `;
  }

  private _renderActiveRun(): TemplateResult {
    const run = this._summary!.active_run!;
    const index = Math.max(0, run.current_index ?? 0);
    const previous = run.zones[index - 1];
    const current = run.zones[index];
    const next = run.zones[index + 1];
    const zoneRemaining = this._remainingSeconds(run.zone_ends_at);
    const remainingAfterCurrent = run.zones
      .slice(index + 1)
      .reduce((sum, zone) => sum + zone.planned_minutes * 60, 0);
    const totalRemaining = zoneRemaining + remainingAfterCurrent;
    const totalSeconds = Math.max(1, run.total_minutes * 60);
    const progress = Math.max(
      0,
      Math.min(100, ((totalSeconds - totalRemaining) / totalSeconds) * 100),
    );
    return html`
      <aside class="active-run" ?expanded=${this._runExpanded}>
        ${this._runExpanded
          ? html`
              <div class="active-run-detail">
                <div class="active-run-detail-head">
                  <div>
                    <span>Aktuális program</span>
                    <strong>${run.program_name}</strong>
                  </div>
                  <button
                    class="icon-button"
                    aria-label="Futás részleteinek bezárása"
                    @click=${() => (this._runExpanded = false)}
                  >
                    <ha-icon icon="mdi:chevron-down"></ha-icon>
                  </button>
                </div>
                <div class="run-countdowns">
                  <div><span>Aktuális kör</span><strong>${this._clock(zoneRemaining)}</strong></div>
                  <div><span>Program vége</span><strong>${this._clock(totalRemaining)}</strong></div>
                </div>
                <div class="run-sequence">
                  ${this._runStep("Előző", previous)}
                  ${this._runStep("Aktuális", current, true)}
                  ${this._runStep("Következő", next)}
                </div>
              </div>
            `
          : nothing}
        <button
          class="active-run-summary"
          aria-expanded=${this._runExpanded}
          @click=${() => (this._runExpanded = !this._runExpanded)}
        >
          <span class="run-pulse"></span>
          <span>
            <strong>${run.program_name}</strong>
            <small>${current?.name ?? "Indítás…"} · ${this._clock(zoneRemaining)}</small>
          </span>
          <span class="run-progress-label">${Math.round(progress)}%</span>
          <ha-icon icon=${this._runExpanded ? "mdi:chevron-down" : "mdi:chevron-up"}></ha-icon>
        </button>
        <div class="active-run-progress"><span style=${`width:${progress}%`}></span></div>
        <div class="active-run-actions">
          <button class="button quiet" @click=${this._skipCurrentZone}>
            Aktuális kör kihagyása
          </button>
          <button class="button danger" @click=${this._stopAll}>
            <ha-icon icon="mdi:stop"></ha-icon>
            Leállítás
          </button>
        </div>
      </aside>
    `;
  }

  private _runStep(
    label: string,
    zone: { name: string; planned_minutes: number; outcome: string } | undefined,
    active = false,
  ): TemplateResult {
    return html`
      <div class="run-step" ?active=${active} ?empty=${!zone}>
        <span>${label}</span>
        <strong>${zone?.name ?? "—"}</strong>
        <small>${zone ? `${zone.planned_minutes} perc` : ""}</small>
      </div>
    `;
  }

  private _remainingSeconds(end?: string): number {
    return end ? Math.max(0, Math.ceil((new Date(end).getTime() - this._now) / 1000)) : 0;
  }

  private _clock(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  private _renderWeather(weather: WeatherDecision | null): TemplateResult {
    if (!weather) {
      return html`
        <section class="weather-band">
          <div class="weather-summary">
            <ha-icon icon="mdi:weather-partly-cloudy"></ha-icon>
            <div>
              <div class="decision">Előrejelzés betöltése</div>
              <div class="weather-reason">Az Időkép adatainak ellenőrzése folyamatban.</div>
            </div>
          </div>
        </section>
      `;
    }
    const percent = weather.percent ?? 0;
    const adjective =
      percent === 0
        ? "kihagyás"
        : percent < 80
          ? "csökkentett öntözés"
          : percent > 120
            ? "emelt öntözés"
            : "mérsékelt öntözés";
    return html`
      <section class="weather-band">
        <div class="weather-summary">
          <ha-icon icon=${percent === 0 ? "mdi:weather-rainy" : "mdi:weather-partly-cloudy"}></ha-icon>
          <div>
            <div class="decision">Ma ${percent}% · ${adjective}</div>
            <div class="weather-reason">${weather.reason}</div>
          </div>
        </div>
        ${this._metric(
          "mdi:cup-water",
          "Elmúlt 24 óra",
          weather.rain_station
            ? `${weather.observed_precipitation_mm ?? 0} mm`
            : "Nincs állomás",
        )}
        ${this._metric("mdi:weather-rainy", "Várható eső", `${weather.precipitation_mm ?? 0} mm`)}
        ${this._metric("mdi:water-percent", "Esély", `${weather.max_probability ?? 0}%`)}
        ${this._metric("mdi:white-balance-sunny", "Napos órák", `${weather.sunny_hours ?? 0}`, "sun")}
        ${this._metric(
          "mdi:water-thermometer-outline",
          "Párolgás",
          weather.adjusted_et0_mm === null || weather.adjusted_et0_mm === undefined
            ? "nincs adat"
            : `${this._formatForecastNumber(weather.adjusted_et0_mm)} mm`,
          "et",
        )}
        ${this._metric("mdi:weather-windy", "Szél max.", this._formatWeatherWind(weather), "wind")}
        ${this._metric("mdi:thermometer", "Maximum", `${weather.max_temperature ?? 0} °C`, "temp")}
      </section>
    `;
  }

  private _metric(icon: string, label: string, value: string, extra = ""): TemplateResult {
    return html`
      <div class="metric ${extra}">
        <ha-icon icon=${icon}></ha-icon>
        <span class="metric-label">${label}</span>
        <span class="metric-value">${value}</span>
      </div>
    `;
  }

  private _renderController(controller: Summary["controllers"][number]): TemplateResult {
    const mobile = window.matchMedia("(max-width: 600px)").matches;
    const expanded = !mobile || this._expandedControllers.includes(controller.id);
    const status = this._controllerStatus(controller);
    return html`
      <section class="controller" ?collapsed=${!expanded}>
        <button
          class="controller-head"
          aria-expanded=${expanded}
          @click=${() => this._toggleController(controller.id)}
        >
          <div class="controller-mark"><ha-icon icon="mdi:sprinkler-variant"></ha-icon></div>
          <div>
            <div class="controller-name">${controller.name}</div>
            <div class="controller-meta">
              ${controller.model} ·
              <span class=${status.className}>
                ${status.label}
              </span>
            </div>
          </div>
          <ha-icon
            class="controller-chevron"
            icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </button>
        ${controller.zones.map((zone) => this._renderZone(zone))}
      </section>
    `;
  }

  private _renderZone(zone: Zone): TemplateResult {
    const duration = this._zoneDurations[zone.entity_id] ?? 15;
    const running = zone.state === "on";
    const activeZone = this._summary?.active_run?.current_zone === zone.entity_id;
    const planned = Number(this._summary?.active_run?.current_duration ?? duration);
    const headLabel = this._headLabel(zone.profile.head_type);
    const issue = this._zoneIssueLabel(zone);
    return html`
      <div class="zone-row">
        <ha-icon icon="mdi:water"></ha-icon>
        <span class="zone-name">${zone.name}</span>
        <span
          class="zone-state"
          ?running=${running}
          ?unavailable=${!zone.available}
          title=${zone.availability_issue ?? zone.entity_id}
        >
          ${running
            ? activeZone
              ? `Fut · ${planned} perc`
              : "Fut"
            : zone.available
              ? `Tétlen · ${headLabel}`
              : html`Nem elérhető <small>${issue}</small>`}
        </span>
        <label class="duration">
          <input
            type="number"
            min="1"
            max="180"
            .value=${String(duration)}
            aria-label="${zone.name} időtartama percben"
            @change=${(event: Event) => {
              const input = event.target as HTMLInputElement;
              this._zoneDurations = {
                ...this._zoneDurations,
                [zone.entity_id]: this._clampDuration(input.valueAsNumber),
              };
            }}
          />
          <span>perc</span>
        </label>
        <button
          class="button"
          ?disabled=${!zone.available || running}
          @click=${() => this._startZone(zone)}
        >
          <ha-icon icon="mdi:play"></ha-icon>
          Indítás
        </button>
      </div>
    `;
  }

  private _controllerStatus(controller: Summary["controllers"][number]): {
    label: string;
    className: string;
  } {
    const total = controller.zone_count ?? controller.zones.length;
    const available =
      controller.available_zone_count ??
      controller.zones.filter((zone) => zone.available).length;
    if (total === 0) return { label: "Nincs zóna", className: "offline" };
    if (available === total) return { label: "Online", className: "online" };
    if (available === 0) {
      return { label: "Nincs elérhető zóna", className: "offline" };
    }
    return { label: `${available}/${total} zóna elérhető`, className: "partial" };
  }

  private _zoneIssueLabel(zone: Zone): string {
    if (zone.state === "missing") return "HA state hiányzik";
    if (zone.state === "unavailable") return "HA: unavailable";
    return zone.availability_issue ?? `HA: ${zone.state}`;
  }

  private _renderRailProgram(program: Program): TemplateResult {
    const total = this._programMinutes(program);
    const smart = this._isSmartProgram(program);
    return html`
      <div class="program-rail-item">
        <div class="program-line">
          <ha-icon
            icon=${smart
              ? "mdi:calendar-clock"
              : program.start_time < "12:00"
                ? "mdi:weather-sunset-up"
                : "mdi:weather-night"}
          ></ha-icon>
          <strong>${program.name}</strong>
          <button
            class="toggle"
            ?on=${program.enabled}
            aria-label="${program.name} engedélyezése"
            @click=${() => this._quickToggleProgram(program)}
          ></button>
        </div>
        <div class="program-details">
          <div>
            ${smart ? "Engedélyezett napok" : "Futási napok"}:
            ${this._formatDays(program.weekdays)}
          </div>
          <div>
            ${smart
              ? `Időablak: ${this._programWindowLabel(program)}`
              : `Kezdés: ${program.start_time}`}
          </div>
          ${program.temperature_condition_enabled
            ? html`<div>${this._temperatureConditionText(program)}</div>`
            : nothing}
          <div>
            ${smart ? "Becsült idő, ha öntöz" : "Számított öntözési idő"}:
            ${total} perc
          </div>
        </div>
      </div>
    `;
  }

  private _renderCompactHistory(record?: RunRecord): TemplateResult {
    return html`
      <div class="history-compact">
        <div class="history-compact-title">Legutóbbi események</div>
        ${record
          ? html`
              <div>${this._formatDateTime(record.scheduled_at)} · ${record.program_name}</div>
              <div class="history-reason">${record.reason}</div>
            `
          : html`<div class="subtle">Még nincs futási előzmény.</div>`}
      </div>
    `;
  }

  private _renderHourlyForecast(): TemplateResult {
    const forecast = this._hourlyForecast;
    const days = forecast ? this._groupForecastDays(forecast.hours) : [];
    return html`
      <div class="page-head">
        <div>
          <h2>Órás előrejelzés</h2>
          <div class="subtle">
            Az öntözési döntésekhez használt, javított napbesorolású Időkép-adatok.
          </div>
        </div>
        <button
          class="button quiet"
          @click=${this._loadHourlyForecast}
          ?disabled=${this._forecastLoading}
        >
          ${this._forecastLoading ? "Frissítés…" : "Frissítés"}
        </button>
      </div>
      ${this._forecastLoading && !forecast
        ? html`<div class="loading">Időkép-előrejelzés betöltése…</div>`
        : forecast
          ? html`
              <div class="forecast-source">
                <span>Forrás: ${forecast.source}</span>
                <span>Frissítve: ${this._formatDateTime(forecast.generated_at)}</span>
              </div>
              <div class="forecast-days">
                ${days.map(
                  (day, index) => html`
                    <section class="forecast-day">
                      <div class="forecast-day-head">
                        <strong>${this._formatForecastDate(day.date, index)}</strong>
                        <span>${day.hours.length} óra</span>
                      </div>
                      <div class="forecast-table-head" aria-hidden="true">
                        <span>Idő</span>
                        <span>Időjárás</span>
                        <span>Hőmérséklet</span>
                        <span>Páratartalom</span>
                        <span>Csapadék</span>
                        <span>Esély</span>
                        <span>Szél</span>
                      </div>
                      ${day.hours.map((hour) => this._renderForecastHour(hour))}
                    </section>
                  `,
                )}
              </div>
            `
          : html`<div class="empty">Az órás Időkép-előrejelzés nem érhető el.</div>`}
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
    `;
  }

  private _renderForecastHour(hour: HourlyForecastHour): TemplateResult {
    const raining =
      hour.precipitation_mm > 0 || hour.precipitation_probability >= 50;
    const windy =
      (hour.wind_speed_kmh ?? 0) >= 30 || (hour.wind_gust_kmh ?? 0) >= 45;
    return html`
      <article class="forecast-hour" ?raining=${raining} ?windy=${windy}>
        <time>${this._formatTime(hour.timestamp)}</time>
        <div class="forecast-condition">
          <ha-icon icon=${this._forecastConditionIcon(hour.condition)}></ha-icon>
          <span>${this._forecastConditionLabel(hour.condition)}</span>
        </div>
        <div class="forecast-metric temperature">
          <span>Hőmérséklet</span>
          <strong>${this._formatForecastNumber(hour.temperature)} °C</strong>
        </div>
        <div class="forecast-metric humidity">
          <span>Páratartalom</span>
          <strong>
            ${hour.humidity_percent === null || hour.humidity_percent === undefined
              ? "nincs adat"
              : `${this._formatForecastNumber(hour.humidity_percent)}%`}
          </strong>
        </div>
        <div class="forecast-metric precipitation">
          <span>Csapadék</span>
          <strong>${this._formatForecastNumber(hour.precipitation_mm)} mm</strong>
        </div>
        <div class="forecast-metric probability">
          <span>Esély</span>
          <strong>${hour.precipitation_probability}%</strong>
        </div>
        <div class="forecast-metric wind">
          <span>Szél</span>
          <strong>${this._formatForecastWind(hour)}</strong>
        </div>
      </article>
    `;
  }

  private _renderSchedule(): TemplateResult {
    const preview = this._schedulePreview;
    return html`
      <div class="page-head">
        <div>
          <h2>Következő 3 nap</h2>
          <div class="subtle">
            A fix programok a megadott időben futnak. A vízigény-alapú
            program csak szükség esetén öntöz, az engedélyezett időablak
            legkedvezőbb részében. A terv az előrejelzéssel változhat.
          </div>
        </div>
        <button
          class="button quiet"
          @click=${this._loadSchedule}
          ?disabled=${this._scheduleLoading}
        >
          ${this._scheduleLoading ? "Frissítés…" : "Újraszámítás"}
        </button>
      </div>
      ${this._scheduleLoading && !preview
        ? html`<div class="loading">Háromnapos programterv számítása…</div>`
        : preview
          ? html`
              <div class="schedule-days">
                ${preview.days.map((day, index) => html`
                  <section class="schedule-day">
                    <div class="schedule-day-head">
                      <strong>${this._formatScheduleDate(day.date, index)}</strong>
                      <span>${day.programs.length} program</span>
                    </div>
                    ${day.programs.length
                      ? day.programs.map((program) =>
                          this._renderScheduleProgram(program),
                        )
                      : html`
                          <div class="schedule-empty">
                            Nincs hátralévő engedélyezett program.
                          </div>
                        `}
                  </section>
                `)}
              </div>
              <div class="schedule-generated">
                Utolsó számítás: ${this._formatDateTime(preview.generated_at)}
              </div>
            `
          : html`<div class="empty">A háromnapos előnézet nem érhető el.</div>`}
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
    `;
  }

  private _renderScheduleProgram(program: ScheduleProgram): TemplateResult {
    const runnable =
      program.status === "will_run" &&
      program.planning_status !== "smart_waiting_forecast" &&
      program.planning_status !== "smart_no_fit";
    const smart = this._isSmartScheduleProgram(program);
    const selectionReason = program.selection_reason?.trim();
    const visualStatus =
      program.planning_status === "smart_no_fit"
        ? "smart_no_fit"
        : program.planning_status === "smart_waiting_forecast"
          ? "smart_waiting_forecast"
          : program.status;
    return html`
      <article class="schedule-program" ?runnable=${runnable}>
        <div class="schedule-program-head">
          <time>${this._scheduleProgramTime(program)}</time>
          <strong>${program.program_name}</strong>
          <span class="schedule-status ${visualStatus}">
            ${this._scheduleStatusLabel(program)}
          </span>
        </div>
        <div class="schedule-reason">${program.reason}</div>
        ${smart && program.window_start_at && program.window_end_at
          ? html`
              <div class="schedule-plan">
                <ha-icon icon="mdi:calendar-clock"></ha-icon>
                <span>
                  Időablak:
                  ${this._formatScheduleRange(
                    program.window_start_at,
                    program.window_end_at,
                  )}
                </span>
              </div>
            `
          : nothing}
        ${selectionReason && selectionReason !== program.reason
          ? html`<div class="schedule-selection-reason">${selectionReason}</div>`
          : nothing}
        ${this._renderScheduleWaterBalance(program)}
        ${program.weather
          ? html`
              <div class="schedule-weather">
                <span>${program.weather.max_temperature ?? "–"} °C max.</span>
                <span>${program.weather.precipitation_mm ?? 0} mm várható</span>
                ${program.weather.observed_precipitation_mm
                  ? html`
                      <span>
                        ${program.weather.observed_precipitation_mm} mm mért / 24 óra
                      </span>
                    `
                  : nothing}
                ${program.weather.max_wind_speed_kmh !== null &&
                program.weather.max_wind_speed_kmh !== undefined
                  ? html`
                      <span>
                        Szél: ${this._formatWeatherWind(program.weather)}
                      </span>
                    `
                  : nothing}
                ${program.weather.adjusted_et0_mm !== null &&
                program.weather.adjusted_et0_mm !== undefined
                  ? html`
                      <span>
                        Párolgás:
                        ${this._formatForecastNumber(program.weather.adjusted_et0_mm)} mm
                      </span>
                    `
                  : nothing}
                ${program.weather.average_humidity_percent !== null &&
                program.weather.average_humidity_percent !== undefined
                  ? html`
                      <span>
                        Páratartalom:
                        ${this._formatForecastNumber(
                          program.weather.average_humidity_percent,
                        )}%
                      </span>
                    `
                  : nothing}
                <span>Forrás: ${program.weather.source}</span>
              </div>
            `
          : nothing}
        <div class="schedule-zones">
          ${program.zones.map(
            (zone) => html`
              <div>
                <span class="schedule-zone-name">
                  <span>${zone.name}</span>
                  ${zone.moisture_percent !== null &&
                  zone.moisture_percent !== undefined
                    ? html`
                        <small>
                          Talaj ${this._formatForecastNumber(zone.moisture_percent)}% ·
                          ${zone.moisture_action === "skip"
                            ? "kimarad"
                            : `${Math.round((zone.moisture_factor ?? 1) * 100)}% idő`}
                        </small>
                      `
                    : zone.moisture_action === "unavailable"
                      ? html`<small>Talaj: nincs használható szenzoradat</small>`
                      : zone.moisture_action === "not_configured"
                        ? html`<small>Talaj: nincs szenzor rendelve</small>`
                    : nothing}
                </span>
                <strong>
                  ${zone.planned_minutes === null
                    ? "nincs adat"
                    : `${zone.planned_minutes} perc`}
                </strong>
              </div>
            `,
          )}
        </div>
        <div class="schedule-total">
          <span>Összesen</span>
          <strong>
            ${program.total_minutes === null
              ? "nem számítható"
              : `${program.total_minutes} perc`}
          </strong>
        </div>
      </article>
    `;
  }

  private _renderScheduleWaterBalance(
    program: ScheduleProgram,
  ): TemplateResult | typeof nothing {
    const values = [
      program.water_balance_before_mm,
      program.daily_water_need_mm,
      program.daily_effective_rain_mm,
      program.daily_ledger_rain_mm,
      program.forecast_rain_mm,
      program.forecast_ledger_rain_mm,
      program.irrigation_target_mm,
      program.remaining_balance_mm,
      program.water_balance_gap_days,
    ];
    if (!values.some((value) => value !== null && value !== undefined)) {
      return nothing;
    }

    const dailyNeed = program.daily_water_need_mm;
    const measuredRain = program.daily_effective_rain_mm;
    const ledgerRain = program.daily_ledger_rain_mm ?? measuredRain;
    const dailyNet =
      dailyNeed === null ||
      dailyNeed === undefined ||
      ledgerRain === null ||
      ledgerRain === undefined
        ? null
        : dailyNeed - ledgerRain;
    return html`
      <dl class="schedule-water-balance" aria-label="Vízmérleg">
        <div>
          <dt>Felhalmozott hiány</dt>
          <dd>${this._formatOptionalMillimeters(program.water_balance_before_mm)}</dd>
        </div>
        <div>
          <dt>Mai nettó változás</dt>
          <dd>
            ${dailyNet === null
              ? "nincs adat"
              : `${dailyNet > 0 ? "+" : ""}${this._formatForecastNumber(dailyNet)} mm`}
            ${dailyNeed !== null &&
            dailyNeed !== undefined &&
            ledgerRain !== null &&
            ledgerRain !== undefined
              ? html`
                  <span>
                    ${this._formatForecastNumber(dailyNeed)} mm igény,
                    ${this._formatForecastNumber(ledgerRain)} mm elszámolt eső
                    ${measuredRain !== null &&
                    measuredRain !== undefined &&
                    Math.abs(measuredRain - ledgerRain) >= 0.05
                      ? html`
                          (${this._formatForecastNumber(measuredRain)} mm mért)
                        `
                      : nothing}
                  </span>
                `
              : nothing}
          </dd>
        </div>
        ${program.forecast_rain_mm !== null &&
        program.forecast_rain_mm !== undefined &&
        program.forecast_rain_mm > 0
          ? html`
              <div>
                <dt>Közelgő eső</dt>
                <dd>
                  ${this._formatOptionalMillimeters(program.forecast_rain_mm)}
                  <span>
                    A halasztási időtávon
                    ${program.forecast_ledger_rain_mm !== null &&
                    program.forecast_ledger_rain_mm !== undefined &&
                    Math.abs(
                      program.forecast_ledger_rain_mm - program.forecast_rain_mm,
                    ) >= 0.05
                      ? html`
                          · ${this._formatForecastNumber(
                            program.forecast_ledger_rain_mm,
                          )} mm vízmérlegre vetítve
                        `
                      : nothing}
                  </span>
                </dd>
              </div>
            `
          : nothing}
        ${(program.water_balance_gap_days ?? 0) > 0
          ? html`
              <div>
                <dt>HA-kiesés</dt>
                <dd>
                  ${program.water_balance_gap_days} nap
                  <span>
                    ${program.water_balance_rebaselined_after_gap
                      ? `biztonságosan újraalapozva${
                          program.water_balance_last_rebaseline_date
                            ? ` · ${this._formatCalendarDate(
                                program.water_balance_last_rebaseline_date,
                              )}`
                            : ""
                        }`
                      : program.water_balance_unaccounted_gap_days
                      ? `${program.water_balance_unaccounted_gap_days} nap nem rekonstruálható`
                      : `${program.water_balance_backfilled_gap_days ?? 0} nap helyreállítva`}
                  </span>
                </dd>
              </div>
            `
          : nothing}
        <div>
          <dt>Kijuttatandó</dt>
          <dd>${this._formatOptionalMillimeters(program.irrigation_target_mm)}</dd>
        </div>
        <div>
          <dt>Megmaradó hiány</dt>
          <dd>${this._formatOptionalMillimeters(program.remaining_balance_mm)}</dd>
        </div>
      </dl>
    `;
  }

  private _renderManualProgram(): TemplateResult {
    const draft = this._manualDraft;
    const allZones = this._allZones();
    return html`
      <div class="page-head">
        <div>
          <h2>Kézi program</h2>
          <div class="subtle">
            Egyszer fut le, nem módosítja a napi ütemezéseket.
          </div>
        </div>
        <button class="button quiet" @click=${this._resetManualProgram}>
          Alaphelyzet
        </button>
      </div>
      <section class="manual-program">
        <div class="manual-program-toolbar">
          <label class="field">
            <span class="field-label">Napi program betöltése</span>
            <select @change=${this._importManualProgram}>
              <option value="">Válassz programot…</option>
              ${this._summary!.programs.map(
                (program) =>
                  html`<option value=${program.program_id}>${program.name}</option>`,
              )}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Kézi program neve</span>
            <input
              type="text"
              maxlength="64"
              .value=${draft.name}
              @input=${(event: Event) =>
                this._patchManual({
                  name: (event.target as HTMLInputElement).value,
                })}
            />
          </label>
          <div class="manual-adjustments">
            <label class="manual-weather">
              <input
                type="checkbox"
                .checked=${draft.weather_adjustment}
                @change=${(event: Event) =>
                  this._patchManual({
                    weather_adjustment: (event.target as HTMLInputElement).checked,
                  })}
              />
              Időjárás-korrekció
            </label>
            <label class="manual-weather">
              <input
                type="checkbox"
                .checked=${draft.soil_moisture_enabled}
                @change=${(event: Event) =>
                  this._patchManual({
                    soil_moisture_enabled: (event.target as HTMLInputElement).checked,
                  })}
              />
              Talajnedvesség-korrekció
            </label>
          </div>
        </div>
        <div class="manual-zone-list">
          ${draft.zones.map((zone, index) => {
            const details = allZones.find(
              (candidate) => candidate.entity_id === zone.entity_id,
            );
            return html`
              <div class="manual-zone">
                <span class="manual-zone-order">${index + 1}</span>
                <strong>${details?.name ?? zone.entity_id}</strong>
                <select
                  aria-label="${details?.name ?? zone.entity_id} számítási módja"
                  .value=${zone.duration_mode}
                  @change=${(event: Event) =>
                    this._updateManualZone(index, {
                      ...zone,
                      duration_mode: (event.target as HTMLSelectElement)
                        .value as ProgramZone["duration_mode"],
                    })}
                >
                  <option value="manual">Rögzített alapidő</option>
                  <option value="reference">Automatikusan számított</option>
                </select>
                <label class="manual-duration">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    ?disabled=${zone.duration_mode === "reference"}
                    .value=${String(zone.duration_minutes)}
                    @change=${(event: Event) =>
                      this._updateManualZone(index, {
                        ...zone,
                        duration_minutes: this._clampDuration(
                          (event.target as HTMLInputElement).valueAsNumber,
                        ),
                      })}
                  />
                  <span>perc</span>
                </label>
                <span class="manual-calculated">
                  ${this._programZoneMinutes(draft, zone)} perc
                  ${this._programZoneMoistureText(draft, zone)}
                </span>
                <div class="manual-zone-actions">
                  <button
                    class="icon-button"
                    aria-label="Kör feljebb"
                    ?disabled=${index === 0}
                    @click=${() => this._moveManualZone(index, -1)}
                  >
                    <ha-icon icon="mdi:chevron-up"></ha-icon>
                  </button>
                  <button
                    class="icon-button"
                    aria-label="Kör lejjebb"
                    ?disabled=${index === draft.zones.length - 1}
                    @click=${() => this._moveManualZone(index, 1)}
                  >
                    <ha-icon icon="mdi:chevron-down"></ha-icon>
                  </button>
                  <button
                    class="icon-button"
                    aria-label="Kör eltávolítása"
                    @click=${() => this._removeManualZone(index)}
                  >
                    <ha-icon icon="mdi:close"></ha-icon>
                  </button>
                </div>
              </div>
            `;
          })}
          ${draft.zones.length
            ? nothing
            : html`<div class="empty">Adj hozzá legalább egy öntözési kört.</div>`}
        </div>
        <div class="manual-add">
          <label class="field">
            <span class="field-label">Kör hozzáadása</span>
            <select @change=${this._addManualZone}>
              <option value="">Válassz zónát…</option>
              ${allZones
                .filter(
                  (zone) =>
                    !draft.zones.some(
                      (selected) => selected.entity_id === zone.entity_id,
                    ),
                )
                .map(
                  (zone) =>
                    html`<option value=${zone.entity_id}>${zone.name}</option>`,
                )}
            </select>
          </label>
          <div class="manual-total">
            <span>Várható teljes idő</span>
            <strong>${this._programMinutes(draft)} perc</strong>
          </div>
          <button
            class="button primary manual-start"
            ?disabled=${this._manualRunning || !draft.zones.length || !!this._summary!.active_run}
            @click=${this._runManualDraft}
          >
            <ha-icon icon="mdi:play"></ha-icon>
            ${this._summary!.active_run
              ? "Már fut egy program"
              : this._manualRunning
                ? "Indítás…"
                : "Kézi program indítása"}
          </button>
        </div>
        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      </section>
    `;
  }

  private _renderPrograms(): TemplateResult {
    const programs = this._summary!.programs;
    const draft = this._draft;
    return html`
      <div class="page-head">
        <h2>Programok</h2>
        <button class="button primary" type="button" @click=${this._newProgram}>
          <ha-icon icon="mdi:plus"></ha-icon>
          Új program
        </button>
      </div>
      <div class="program-workspace">
        <div class="program-list">
          ${programs.length
            ? programs.map(
                (program) => html`
                  <button
                    class="program-list-item"
                    ?selected=${draft?.program_id === program.program_id}
                    @click=${() => {
                      this._draft = cloneProgram(program);
                    }}
                  >
                    <strong>${program.name}</strong>
                    <span>${program.enabled ? "Aktív" : "Kikapcsolva"}</span>
                    <span>
                      ${this._formatDays(program.weekdays)} ·
                      ${this._isSmartProgram(program)
                        ? `Vízigény-alapú · ${this._programWindowLabel(program)}`
                        : `Rögzített · ${program.start_time}`}
                    </span>
                    <span>${this._programMinutes(program)} perc</span>
                  </button>
                `,
              )
            : html`<div class="empty">Hozd létre az első öntözési programot.</div>`}
        </div>
        ${draft ? this._renderProgramEditor(draft) : html`<div class="empty">Válassz egy programot.</div>`}
      </div>
    `;
  }

  private _renderProgramEditor(draft: Program): TemplateResult {
    const allZones = this._allZones();
    const smart = this._isSmartProgram(draft);
    const windowMinutes = this._windowDurationMinutes(draft);
    const currentMinutes = this._programMinutes(draft);
    const doesNotFit =
      smart &&
      draft.zones.length > 0 &&
      windowMinutes > 0 &&
      currentMinutes > windowMinutes;
    return html`
      <form class="editor" @submit=${this._saveDraft}>
        <div class="field">
          <label for="program-name">Program neve</label>
          <input
            id="program-name"
            type="text"
            maxlength="64"
            required
            .value=${draft.name}
            @input=${(event: Event) => this._patchDraft({ name: (event.target as HTMLInputElement).value })}
          />
        </div>
        <div class="field">
          <span class="field-label">
            ${smart ? "Engedélyezett öntözési napok" : "Futási napok"}
          </span>
          <div class="days">
            ${DAY_NAMES.map(
              (day, index) => html`
                <button
                  class="day"
                  type="button"
                  ?selected=${draft.weekdays.includes(index)}
                  aria-pressed=${draft.weekdays.includes(index)}
                  @click=${() => this._toggleDay(index)}
                >
                  ${day}
                </button>
              `,
            )}
          </div>
          ${smart
            ? html`
                <div class="field-help">
                  A rendszer nem feltétlenül öntöz minden kijelölt napon. A
                  vízigényt gyűjti, és az időablakon belül a legjobb időpontot
                  választja.
                </div>
              `
            : nothing}
        </div>
        <fieldset class="schedule-mode-field">
          <legend>Indítás módja</legend>
          <div class="schedule-mode-options">
            <label class="schedule-mode-option" ?selected=${smart}>
              <input
                type="radio"
                name="program-schedule-mode"
                value="smart_window"
                .checked=${smart}
                @change=${(event: Event) => {
                  if ((event.target as HTMLInputElement).checked) {
                    this._patchDraft({ schedule_mode: "smart_window" });
                  }
                }}
              />
              <span>
                <strong>Vízigény-alapú időablak</strong>
                <small>
                  Csak szükség esetén indul, a legkisebb párolgási veszteségű
                  időpontban.
                </small>
              </span>
            </label>
            <label class="schedule-mode-option" ?selected=${!smart}>
              <input
                type="radio"
                name="program-schedule-mode"
                value="fixed"
                .checked=${!smart}
                @change=${(event: Event) => {
                  if ((event.target as HTMLInputElement).checked) {
                    this._patchDraft({ schedule_mode: "fixed" });
                  }
                }}
              />
              <span>
                <strong>Fix időpont</strong>
                <small>
                  A megadott időpontban indul; az aktív szélvédelem
                  szükség esetén halaszthatja.
                </small>
              </span>
            </label>
          </div>
        </fieldset>
        ${smart
          ? html`
              <div class="watering-window">
                <div class="field">
                  <label for="program-window-start">Öntözhet ettől</label>
                  <input
                    id="program-window-start"
                    type="time"
                    required
                    aria-describedby="program-window-help"
                    .value=${draft.window_start_time}
                    @input=${(event: Event) =>
                      this._patchDraft({
                        window_start_time: (event.target as HTMLInputElement).value,
                      })}
                  />
                </div>
                <div class="field">
                  <label for="program-window-end">Legkésőbb eddig fejezze be</label>
                  <input
                    id="program-window-end"
                    type="time"
                    required
                    aria-describedby="program-window-help"
                    .value=${draft.window_end_time}
                    @input=${(event: Event) =>
                      this._patchDraft({
                        window_end_time: (event.target as HTMLInputElement).value,
                      })}
                  />
                </div>
              </div>
              <p class="window-help" id="program-window-help">
                A teljes program az időablakon belül fut le. A kijelölt nap
                öntözési lehetőség, nem kötelező futás. Ha a zárási idő korábbi,
                az ablak másnap ér véget. A szárazabb, kevésbé szeles,
                sötétebb, hűvösebb és párásabb időpont előnyt kap.
              </p>
              ${doesNotFit
                ? html`
                    <div class="window-fit-warning" role="status">
                      <ha-icon icon="mdi:alert-outline"></ha-icon>
                      <span>
                        A jelenlegi becslés ${currentMinutes} perc, az időablak
                        ${windowMinutes} perc. A rendszer szükség esetén kisebb
                        kijuttatási mélységet keres, de zónasort nem vág félbe.
                      </span>
                    </div>
                  `
                : draft.zones.length > 0 && windowMinutes > 0
                  ? html`
                      <div class="window-capacity">
                        Becsült futási idő: ${currentMinutes} perc a
                        ${windowMinutes} perces időablakban.
                      </div>
                    `
                  : nothing}
            `
          : html`
              <div class="field">
                <label for="program-start">Kezdés</label>
                <input
                  id="program-start"
                  type="time"
                  required
                  .value=${draft.start_time}
                  @input=${(event: Event) =>
                    this._patchDraft({
                      start_time: (event.target as HTMLInputElement).value,
                    })}
                />
                <div class="field-help">
                  A szélvédelem szükség esetén ezt az indítást továbbra is
                  halaszthatja.
                </div>
              </div>
            `}
        <div class="checkline">
          <input
            id="program-enabled"
            type="checkbox"
            .checked=${draft.enabled}
            @change=${(event: Event) =>
              this._patchDraft({ enabled: (event.target as HTMLInputElement).checked })}
          />
          <label for="program-enabled">Program engedélyezve</label>
        </div>
        <div class="checkline">
          <input
            id="program-weather"
            type="checkbox"
            .checked=${draft.weather_adjustment}
            @change=${(event: Event) =>
              this._patchDraft({
                weather_adjustment: (event.target as HTMLInputElement).checked,
              })}
          />
          <label for="program-weather">Időjárás-korrekció használata</label>
        </div>
        <div class="checkline">
          <input
            id="program-temperature-condition"
            type="checkbox"
            .checked=${draft.temperature_condition_enabled}
            @change=${(event: Event) =>
              this._patchDraft({
                temperature_condition_enabled: (event.target as HTMLInputElement)
                  .checked,
              })}
          />
          <label for="program-temperature-condition">
            Hőmérséklet-feltétel használata
          </label>
        </div>
        ${draft.temperature_condition_enabled
          ? html`
              <div class="temperature-condition">
                <span>A program napjának maximuma</span>
                <select
                  aria-label="Hőmérséklet összehasonlítása"
                  .value=${draft.temperature_condition_operator}
                  @change=${(event: Event) =>
                    this._patchDraft({
                      temperature_condition_operator: (event.target as HTMLSelectElement)
                        .value as "above" | "below",
                    })}
                >
                  <option value="above">magasabb mint</option>
                  <option value="below">alacsonyabb mint</option>
                </select>
                <label>
                  <input
                    type="number"
                    min="-30"
                    max="60"
                    step="0.5"
                    aria-label="Hőmérsékleti küszöb"
                    .value=${String(draft.temperature_condition_value)}
                    @change=${(event: Event) =>
                      this._patchDraft({
                        temperature_condition_value: Math.max(
                          -30,
                          Math.min(
                            60,
                            (event.target as HTMLInputElement).valueAsNumber,
                          ),
                        ),
                      })}
                  />
                  <span>°C</span>
                </label>
              </div>
            `
          : nothing}
        <div class="checkline">
          <input
            id="program-soil-moisture"
            type="checkbox"
            .checked=${draft.soil_moisture_enabled}
            @change=${(event: Event) =>
              this._patchDraft({
                soil_moisture_enabled: (event.target as HTMLInputElement).checked,
              })}
          />
          <label for="program-soil-moisture">
            A zónák talajnedvességmérőinek használata
          </label>
        </div>
        ${draft.soil_moisture_enabled
          ? html`
              <div class="subtle">
                ${draft.zones.filter(
                  (zone) => this._zoneProfile(zone.entity_id)?.moisture_sensor_entity_id,
                ).length}
                programzónához van érzékelő rendelve. A nedves zónák rövidebb
                ideig futnak, a kihagyási küszöb felett pedig kimaradnak.
              </div>
            `
          : nothing}
        <div class="field">
          <span class="field-label">Zónák sorrendben</span>
          <div class="editor-zones">
            ${draft.zones.map((zone, index) => {
              const details = allZones.find((candidate) => candidate.entity_id === zone.entity_id);
              return html`
                <div class="editor-zone">
                  <span>${details?.name ?? zone.entity_id}</span>
                  <select
                    aria-label="${details?.name ?? zone.entity_id} időtartam módja"
                    .value=${zone.duration_mode}
                    @change=${(event: Event) =>
                      this._updateDraftZone(index, {
                        ...zone,
                        duration_mode: (event.target as HTMLSelectElement).value as
                          | "manual"
                          | "reference",
                      })}
                  >
                    <option value="manual">Rögzített alapidő</option>
                    <option value="reference">Automatikusan számított</option>
                  </select>
                  ${zone.duration_mode === "reference"
                    ? html`
                        <span class="calculated-duration">
                          ≈ ${this._programZoneMinutes(draft, zone)} perc
                          ${this._programZoneMoistureText(draft, zone)}
                        </span>
                      `
                    : html`
                        <label class="editor-duration">
                          <input
                            type="number"
                            min="1"
                            max="180"
                            aria-label="${details?.name ?? zone.entity_id} időtartama"
                            .value=${String(zone.duration_minutes)}
                            @change=${(event: Event) =>
                              this._updateDraftZone(index, {
                                ...zone,
                                duration_minutes: this._clampDuration(
                                  (event.target as HTMLInputElement).valueAsNumber,
                                ),
                              })}
                          />
                          <span>perc</span>
                        </label>
                      `}
                  <button
                    class="icon-button"
                    type="button"
                    aria-label="Zóna eltávolítása"
                    @click=${() => this._removeDraftZone(index)}
                  >
                    <ha-icon icon="mdi:close"></ha-icon>
                  </button>
                </div>
              `;
            })}
            ${draft.zones.length === 0
              ? html`<div class="empty">Adj legalább egy zónát a programhoz.</div>`
              : nothing}
          </div>
        </div>
        <div class="field">
          <label for="zone-add">Zóna hozzáadása</label>
          <select id="zone-add" @change=${this._addDraftZone}>
            <option value="">Válassz zónát…</option>
            ${allZones
              .filter((zone) => !draft.zones.some((item) => item.entity_id === zone.entity_id))
              .map((zone) => html`<option value=${zone.entity_id}>${zone.name}</option>`)}
          </select>
        </div>
        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
        <div class="editor-actions">
          <button class="button danger" type="button" @click=${this._deleteDraft}>
            Törlés
          </button>
          <div>
            <button
              class="button quiet"
              type="button"
              @click=${() => this._runDraft(draft)}
              ?disabled=${this._saving}
            >
              Futtatás most
            </button>
            <button class="button primary" type="submit" ?disabled=${this._saving}>
              ${this._saving ? "Mentés…" : "Mentés"}
            </button>
          </div>
        </div>
      </form>
    `;
  }

  private _renderHistory(): TemplateResult {
    const records = this._summary!.history;
    return html`
      <div class="page-head"><h2>Előzmények</h2></div>
      ${records.length
        ? html`
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Időpont</th>
                    <th>Program</th>
                    <th>Eredmény</th>
                    <th>Korrekció</th>
                    <th>Forrás</th>
                    <th>Indoklás</th>
                  </tr>
                </thead>
                <tbody>
                  ${records.map(
                    (record) => html`
                      <tr>
                        <td>${this._formatDateTime(record.scheduled_at)}</td>
                        <td>${record.program_name}</td>
                        <td>
                          <span class="outcome ${record.outcome}">
                            ${this._outcomeLabel(record.outcome)}
                          </span>
                        </td>
                        <td>${Math.round(record.factor * 100)}%</td>
                        <td>${record.weather_source}</td>
                        <td class="reason-cell">
                          <div>${record.reason}</div>
                          ${record.weather
                            ? html`
                                <div class="history-weather">
                                  Döntéskor:
                                  ${record.weather.precipitation_mm ?? 0} mm ·
                                  ${record.weather.observed_precipitation_mm
                                    ? html`
                                        ${record.weather.observed_precipitation_mm}
                                        mm mért / 24 óra ·
                                      `
                                    : nothing}
                                  ${record.weather.max_probability ?? 0}% ·
                                  ${record.weather.rainy_hours ?? 0} esős óra ·
                                  ${record.weather.max_wind_speed_kmh !== null &&
                                  record.weather.max_wind_speed_kmh !== undefined
                                    ? html`
                                        ${this._formatWeatherWind(record.weather)}
                                        szél ·
                                      `
                                    : nothing}
                                  ${record.weather.max_temperature ?? "–"} °C
                                  ${record.weather.adjusted_et0_mm !== null &&
                                  record.weather.adjusted_et0_mm !== undefined
                                    ? html`
                                        · ${this._formatForecastNumber(
                                          record.weather.adjusted_et0_mm,
                                        )} mm párolgás
                                      `
                                    : nothing}
                                  ${record.weather.evaluated_at
                                    ? html` · ${this._formatDateTime(
                                        record.weather.evaluated_at,
                                      )}`
                                    : nothing}
                                </div>
                              `
                            : nothing}
                          ${this._historyMoistureText(record)
                            ? html`
                                <div class="history-weather">
                                  Talajnedvesség: ${this._historyMoistureText(record)}
                                </div>
                              `
                            : nothing}
                        </td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            </div>
          `
        : html`<div class="empty">Még nincs futási előzmény.</div>`}
    `;
  }

  private _renderSettings(): TemplateResult {
    const settings = this._summary!.settings;
    return html`
      <div class="page-head">
        <div>
          <h2>Beállítások</h2>
          <div class="subtle">Zöld gyep elsődleges időjárási profil</div>
        </div>
        <button
          class="button primary"
          @click=${this._saveSettings}
          ?disabled=${this._settingsSaving}
        >
          ${this._settingsSaving ? "Mentés…" : "Beállítások mentése"}
        </button>
      </div>
      <div class="settings-grid">
        <section class="settings-section">
          <h3>Eső miatti korrekció</h3>
          ${this._settingNumber("Kihagyás ennyi csapadéktól (mm)", "rain_skip_mm", settings)}
          ${this._settingNumber(
            "Kihagyási valószínűség (%)",
            "rain_skip_probability",
            settings,
          )}
          ${this._settingNumber(
            "Valószínűséghez tartozó minimum eső (mm)",
            "rain_skip_probability_mm",
            settings,
          )}
          ${this._settingNumber("Esős órák száma kihagyáshoz", "rainy_hours_skip", settings)}
          ${this._settingNumber(
            "Erős csökkentés küszöbe (mm)",
            "rain_reduce_high_mm",
            settings,
          )}
          ${this._settingNumber(
            "Enyhe csökkentés küszöbe (mm)",
            "rain_reduce_low_mm",
            settings,
          )}
        </section>
        <section class="settings-section">
          <h3>Párolgás alapú számítás</h3>
          <div class="setting-row">
            <span>Hargreaves–Samani ET használata</span>
            <button
              class="toggle"
              ?on=${settings.evapotranspiration_enabled}
              aria-label="Párolgás alapú számítás kapcsolása"
              @click=${() =>
                this._patchSettings({
                  evapotranspiration_enabled: !settings.evapotranspiration_enabled,
                })}
            ></button>
          </div>
          <p class="settings-help">
            Az Időkép napi hőmérsékleteiből és a Home Assistant helyének
            szélességi fokából számított ET0 értéket a felhőzet, a naposság, a
            páratartalom és a szél finomítja. Az eső miatti kihagyás és a
            szélhalasztás ettől függetlenül továbbra is érvényes.
          </p>
          ${this._settingNumber("Referencia ET0 (mm/nap)", "et_reference_mm", settings)}
          ${this._settingNumber("Gyep növényi együttható (Kc)", "et_crop_coefficient", settings)}
        </section>
        <section class="settings-section">
          <h3>Vízigény-alapú tervezés</h3>
          <p class="settings-help">
            A rendszer a napi vízhiányt gyűjti. Csak a beállított küszöbnél
            indít, majd az engedélyezett időablak legjobb időpontját választja.
          </p>
          ${this._settingNumber(
            "Minimum indítási vízhiány (mm)",
            "water_balance_min_mm",
            settings,
            0.1,
            0,
            50,
            true,
          )}
          ${this._settingNumber(
            "Egy alkalom maximuma (mm)",
            "water_balance_max_event_mm",
            settings,
            0.5,
            0.5,
            50,
            true,
          )}
          ${this._settingNumber(
            "Esőkredit maximuma (mm)",
            "water_balance_max_rain_credit_mm",
            settings,
            0.1,
            0,
            100,
            true,
          )}
          ${this._settingNumber(
            "Max. halasztott engedélyezett alkalom",
            "water_balance_max_defer_windows",
            settings,
            1,
            0,
            30,
            true,
          )}
          ${this._settingNumber(
            "Eső-előretekintés (óra)",
            "water_balance_rain_lookahead_hours",
            settings,
            1,
            1,
            168,
            true,
          )}
        </section>
        <section class="settings-section">
          <h3>Talajnedvesség-korrekció</h3>
          <p class="settings-help">
            A programban engedélyezett, zónához rendelt százalékos szenzor
            módosítja az időjárás és ET alapján már kiszámolt időt. A célérték
            felett arányosan rövidít, a kihagyási küszöbtől pedig nem indítja el
            az adott zónát.
          </p>
          ${this._settingNumber("Száraz talaj küszöbe (%)", "soil_moisture_dry_percent", settings)}
          ${this._settingNumber("Célérték (%)", "soil_moisture_target_percent", settings)}
          ${this._settingNumber("Zóna kihagyása ettől (%)", "soil_moisture_skip_percent", settings)}
          ${this._settingNumber("Maximális szárazsági szorzó", "soil_moisture_max_factor", settings)}
        </section>
        <section class="settings-section">
          <h3>Biztonság és értesítés</h3>
          <div class="setting-row">
            <span>Automatika</span>
            <button
              class="toggle"
              ?on=${this._summary!.automation_enabled}
              aria-label="Automatika kapcsolása"
              @click=${this._toggleAutomation}
            ></button>
          </div>
          <div class="setting-row">
            <span>Mobilértesítések</span>
            <button
              class="toggle"
              ?on=${settings.notify_mobile}
              aria-label="Mobilértesítések kapcsolása"
              @click=${() =>
                this._patchSettings({ notify_mobile: !settings.notify_mobile })}
            ></button>
          </div>
          <div class="ntfy-link-row">
            <span>ntfy link</span>
            <div>
              <input
                readonly
                aria-label="ntfy értesítési link"
                .value=${settings.ntfy_link || "Még nincs létrehozva"}
                @focus=${(event: FocusEvent) =>
                  (event.currentTarget as HTMLInputElement).select()}
              />
              <button
                class="button quiet"
                ?disabled=${!settings.ntfy_link}
                @click=${this._copyNtfyLink}
              >
                ${this._ntfyCopied ? "Másolva" : "Másolás"}
              </button>
            </div>
          </div>
          <p class="settings-help ntfy-help">
            Ez a topic a Home Assistant tárolójában marad, ezért HACS/frissítés
            után sem változik. Az ntfy appban erre a linkre iratkozz fel.
          </p>
          <div class="setting-row">
            <span>Automatika szüneteltetése 24 órára</span>
            <button class="button quiet" @click=${this._pauseDay}>Szünet</button>
          </div>
          <div class="setting-row">
            <span>Szünet megszüntetése</span>
            <button class="button quiet" @click=${this._resume}>Folytatás</button>
          </div>
          <div class="setting-row">
            <span>Legutóbbi aktuális számítás forrása</span>
            <strong>${this._summary!.weather?.source ?? "Nincs értékelés"}</strong>
          </div>
        </section>
        <section class="settings-section">
          <h3>Szélkorrekció</h3>
          <div class="setting-row">
            <span>Szél figyelése automata programnál</span>
            <button
              class="toggle"
              ?on=${settings.wind_adjustment_enabled}
              aria-label="Szélkorrekció kapcsolása"
              @click=${() =>
                this._patchSettings({
                  wind_adjustment_enabled: !settings.wind_adjustment_enabled,
                })}
            ></button>
          </div>
          <div class="setting-row">
            <span>Erős szélben halasztás</span>
            <button
              class="toggle"
              ?on=${settings.wind_delay_enabled}
              aria-label="Szél miatti halasztás kapcsolása"
              @click=${() =>
                this._patchSettings({
                  wind_delay_enabled: !settings.wind_delay_enabled,
                })}
            ></button>
          </div>
          ${this._settingNumber("Halasztási lépés (perc)", "wind_delay_step_minutes", settings)}
          <label class="setting-row">
            <span>Halasztás legkésőbb eddig</span>
            <input
              type="time"
              .value=${settings.wind_delay_until}
              @change=${(event: Event) =>
                this._patchSettings({
                  wind_delay_until: (event.target as HTMLInputElement).value,
                })}
            />
          </label>
          ${this._settingNumber("Sprayer szélhatár (km/h)", "wind_speed_threshold_spray", settings)}
          ${this._settingNumber("Sprayer lökéshatár (km/h)", "wind_gust_threshold_spray", settings)}
          ${this._settingNumber("Rotator / MP800 szélhatár (km/h)", "wind_speed_threshold_rotator", settings)}
          ${this._settingNumber("Rotator / MP800 lökéshatár (km/h)", "wind_gust_threshold_rotator", settings)}
          ${this._settingNumber("Rotoros szélhatár (km/h)", "wind_speed_threshold_rotor", settings)}
          ${this._settingNumber("Rotoros lökéshatár (km/h)", "wind_gust_threshold_rotor", settings)}
        </section>
        <section class="settings-section forecast-settings">
          <h3>Időkép előrejelzés</h3>
          <p class="settings-help">
            Ez a település adja az órás előrejelzést, a hőmérsékleti
            feltételeket és az öntözési korrekciót. Mentéskor az Időkép
            integráció újratöltődik. A lehullott csapadék automatája ettől
            külön választható.
          </p>
          <label class="forecast-location">
            <span>Előrejelzés települése</span>
            <input
              type="text"
              placeholder="például Csömör"
              .value=${settings.idokep_location}
              @input=${(event: Event) =>
                this._patchSettings({
                  idokep_location: (event.target as HTMLInputElement).value,
                })}
            />
          </label>
        </section>
        <section class="settings-section rain-station-settings">
          <h3>Lehullott csapadék · Időkép automata</h3>
          <p class="settings-help">
            A településhez tartozó Időkép automaták elmúlt 24 órás mérése
            beleszámít az eső miatti csökkentésbe és kihagyásba. Ez közeli
            állomásadat, nem a kertben végzett mérés.
          </p>
          <label class="rain-station-city">
            <span>Település</span>
            <div>
              <input
                type="text"
                placeholder="például Csömör"
                .value=${settings.rain_station_city}
                @input=${(event: Event) =>
                  this._patchSettings({
                    rain_station_city: (event.target as HTMLInputElement).value,
                  })}
              />
              <button
                class="button quiet"
                type="button"
                ?disabled=${this._rainStationSearching ||
                settings.rain_station_city.trim().length < 2}
                @click=${this._searchRainStations}
              >
                ${this._rainStationSearching ? "Keresés…" : "Automaták keresése"}
              </button>
            </div>
          </label>
          ${this._rainStationMatches.length
            ? html`
                <label class="rain-station-result">
                  <span>Használt automata</span>
                  <select
                    .value=${settings.rain_station_id}
                    @change=${(event: Event) => {
                      const station = this._rainStationMatches.find(
                        (item) =>
                          item.station_id ===
                          (event.target as HTMLSelectElement).value,
                      );
                      if (station) {
                        this._patchSettings({
                          rain_station_id: station.station_id,
                          rain_station_name: station.location,
                        });
                      }
                    }}
                  >
                    ${this._rainStationMatches.map(
                      (station) => html`
                        <option value=${station.station_id}>
                          ${station.location} · ${station.station_id} ·
                          ${station.measured_mm} mm
                        </option>
                      `,
                    )}
                  </select>
                </label>
              `
            : nothing}
          <div class="rain-station-status">
            <span>Kiválasztva</span>
            <strong>
              ${settings.rain_station_id
                ? `${settings.rain_station_name} (${settings.rain_station_id})`
                : "Nincs automata kiválasztva"}
            </strong>
          </div>
          ${this._summary!.rain_observation
            ? html`
                <div class="rain-station-reading">
                  <span>Elmúlt 24 óra</span>
                  <strong>${this._summary!.rain_observation.measured_mm} mm</strong>
                  <span>
                    Radarbecslés: ${this._summary!.rain_observation.radar_mm} mm
                  </span>
                </div>
              `
            : this._summary!.rain_observation_error
              ? html`
                  <div class="rain-station-error">
                    ${this._summary!.rain_observation_error}
                  </div>
                `
              : nothing}
        </section>
      </div>
      <section class="settings-section zone-profiles">
        <h3>Zónák vízigénye, szórófeje és érzékelője</h3>
        <p class="settings-help">
          Referencia módban a program a célzott vízmennyiséget osztja a kijuttatási
          intenzitással. Ha a teljes zónavízhozam és a terület is ki van töltve,
          azok felülírják a fejtípus referenciaértékét. Az árnyékos terület 20%-kal
          rövidebb referenciaidőt kap. Egy talajnedvességmérő több zónához is
          hozzárendelhető. Ha a programban engedélyezed a talajnedvesség
          használatát, az aktuális százalék rövidíti vagy növeli az időt, a
          kihagyási küszöb felett pedig a zóna nem indul el.
        </p>
        <div class="moisture-bulk">
          <label>
            <span>Talajnedvességmérő minden zónához</span>
            <select
              .value=${this._bulkMoistureSensor}
              @change=${(event: Event) => {
                this._bulkMoistureSensor = (event.target as HTMLSelectElement).value;
              }}
            >
              <option value="">Válassz érzékelőt…</option>
              ${this._moistureSensors().map(
                (sensor) => html`<option value=${sensor.entity_id}>${sensor.name}</option>`,
              )}
            </select>
          </label>
          <button
            class="button quiet"
            type="button"
            ?disabled=${!this._bulkMoistureSensor}
            @click=${() => this._assignMoistureSensorToAll(this._bulkMoistureSensor)}
          >
            Hozzárendelés mindhez
          </button>
        </div>
        <div class="zone-profile-head" aria-hidden="true">
          <span>Zóna</span>
          <span>Fejtípus</span>
          <span>Terület jellege</span>
          <span>Referencia</span>
          <span>Vízhozam</span>
          <span>Terület</span>
          <span>Talajnedvesség</span>
          <span>Aktív érték</span>
        </div>
        ${this._allZones().map((zone) => this._renderZoneProfile(zone))}
        <div class="zone-profile-actions">
          ${this._settingsSaved
            ? html`<span class="save-success">A zónabeállítások elmentve.</span>`
            : html`<span>A módosítások mentés után lépnek életbe.</span>`}
          <button
            class="button primary"
            type="button"
            @click=${this._saveSettings}
            ?disabled=${this._settingsSaving}
          >
            ${this._settingsSaving ? "Mentés…" : "Zónabeállítások mentése"}
          </button>
        </div>
      </section>
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
    `;
  }

  private _renderZoneProfile(zone: Zone): TemplateResult {
    const profile = zone.profile;
    const measured = profile.flow_l_min !== null && profile.area_m2 !== null;
    return html`
      <div class="zone-profile-row">
        <strong>${zone.name}</strong>
        <label>
          <span class="mobile-label">Fejtípus</span>
          <select
            .value=${profile.head_type}
            @change=${(event: Event) => {
              const headType = (event.target as HTMLSelectElement)
                .value as ZoneProfile["head_type"];
              const reference = HEAD_TYPES.find((item) => item.value === headType);
              this._patchZoneProfile(zone.entity_id, {
                head_type: headType,
                reference_rate_mm_h: reference?.rate ?? profile.reference_rate_mm_h,
              });
            }}
          >
            ${HEAD_TYPES.map(
              (item) =>
                html`
                  <option
                    value=${item.value}
                    ?selected=${item.value === profile.head_type}
                  >
                    ${item.label}
                  </option>
                `,
            )}
          </select>
        </label>
        <label>
          <span class="mobile-label">Terület jellege</span>
          <select
            .value=${profile.exposure}
            @change=${(event: Event) =>
              this._patchZoneProfile(zone.entity_id, {
                exposure: (event.target as HTMLSelectElement)
                  .value as ZoneProfile["exposure"],
                exposure_factor:
                  (event.target as HTMLSelectElement).value === "shady" ? 0.8 : 1,
              })}
          >
            <option value="sunny" ?selected=${profile.exposure === "sunny"}>
              Napos
            </option>
            <option value="shady" ?selected=${profile.exposure === "shady"}>
              Árnyékos
            </option>
          </select>
        </label>
        ${this._profileNumber(zone, "reference_rate_mm_h", "mm/óra", 0.1)}
        ${this._profileNumber(zone, "flow_l_min", "l/perc", 0.1, true)}
        ${this._profileNumber(zone, "area_m2", "m²", 0.1, true)}
        <label class="moisture-select">
          <span class="mobile-label">Talajnedvességmérő</span>
          <select
            .value=${profile.moisture_sensor_entity_id ?? ""}
            @change=${(event: Event) =>
              this._patchZoneProfile(zone.entity_id, {
                moisture_sensor_entity_id:
                  (event.target as HTMLSelectElement).value || null,
              })}
          >
            <option value="">Nincs hozzárendelve</option>
            ${this._moistureSensors().map(
              (sensor) => html`
                <option
                  value=${sensor.entity_id}
                  ?selected=${sensor.entity_id === profile.moisture_sensor_entity_id}
                >
                  ${sensor.name}
                </option>
              `,
            )}
          </select>
          ${profile.moisture_sensor_entity_id
            ? html`
                <span class="sensor-reading">
                  ${profile.moisture_sensor_state ?? "–"}${profile.moisture_sensor_unit ?? ""}
                </span>
              `
            : nothing}
        </label>
        <span class="effective-rate">
          <strong>${this._effectiveRate(profile).toFixed(1)} mm/óra</strong>
          <span>
            ${measured ? "mért adatokból" : "referencia"} ·
            ${profile.exposure === "shady" ? "80% árnyék" : "100% napos"}
          </span>
        </span>
      </div>
    `;
  }

  private _profileNumber(
    zone: Zone,
    key: "reference_rate_mm_h" | "flow_l_min" | "area_m2",
    unit: string,
    step: number,
    optional = false,
  ): TemplateResult {
    const value = zone.profile[key];
    return html`
      <label class="profile-number">
        <span class="mobile-label">${unit}</span>
        <input
          type="number"
          min="0.1"
          step=${step}
          placeholder=${optional ? "opcionális" : ""}
          .value=${value === null ? "" : String(value)}
          @change=${(event: Event) => {
            const input = event.target as HTMLInputElement;
            this._patchZoneProfile(zone.entity_id, {
              [key]: input.value === "" ? null : input.valueAsNumber,
            });
          }}
        />
        <span>${unit}</span>
      </label>
    `;
  }

  private _settingNumber(
    label: string,
    key: keyof Settings,
    settings: Settings,
    step = 0.1,
    min?: number,
    max?: number,
    required = false,
  ): TemplateResult {
    return html`
      <label class="setting-row">
        <span>${label}</span>
        <input
          type="number"
          step=${step}
          min=${min ?? nothing}
          max=${max ?? nothing}
          ?required=${required}
          .value=${String(settings[key])}
          @change=${(event: Event) => {
            const input = event.target as HTMLInputElement;
            if (!Number.isFinite(input.valueAsNumber) || !input.checkValidity()) {
              input.reportValidity();
              input.value = String(settings[key]);
              return;
            }
            this._patchSettings({
              [key]: input.valueAsNumber,
            } as Partial<Settings>);
          }}
        />
      </label>
    `;
  }

  private async _load(initial: boolean): Promise<void> {
    if (!this.hass) {
      if (initial) this._loading = true;
      return;
    }
    try {
      const summary = await getSummary(this.hass);
      summary.programs = summary.programs.map(normalizeProgram);
      this._summary = summary;
      if (!this._expandedControllers.length && summary.controllers[0]) {
        this._expandedControllers = [summary.controllers[0].id];
      }
      this._error = "";
      if (initial || !summary.weather) {
        summary.weather = await previewWeather(this.hass);
        this._summary = { ...summary };
      }
      if (this._tab === "programs" && !this._draft) this._selectFirstProgram();
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._loading = false;
    }
  }

  private _loadSchedule = async (): Promise<void> => {
    if (!this.hass || this._scheduleLoading) return;
    this._scheduleLoading = true;
    try {
      this._schedulePreview = await previewSchedule(this.hass);
      this._error = "";
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._scheduleLoading = false;
    }
  };

  private _loadHourlyForecast = async (): Promise<void> => {
    if (!this.hass || this._forecastLoading) return;
    this._forecastLoading = true;
    try {
      this._hourlyForecast = await getHourlyForecast(this.hass);
      this._error = "";
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._forecastLoading = false;
    }
  };

  private _selectFirstProgram(): void {
    const first = this._summary?.programs[0];
    this._draft = first ? cloneProgram(first) : null;
  }

  private _nextProgramName(): string {
    if (this._summary?.next_run_plan?.program_name) {
      return this._summary.next_run_plan.program_name;
    }
    if (!this._summary?.next_run) return "";
    const target = new Date(this._summary.next_run);
    return (
      this._summary.programs.find((program) => {
        if (this._isSmartProgram(program)) return false;
        const [hours, minutes] = program.start_time.split(":").map(Number);
        return hours === target.getHours() && minutes === target.getMinutes();
      })?.name ?? "Program"
    );
  }

  private _programMinutes(program: Program): number {
    return program.zones.reduce(
      (total, zone) => total + this._programZoneMinutes(program, zone),
      0,
    );
  }

  private _programZoneMinutes(program: Program, zone: ProgramZone): number {
    const weather = this._summary?.weather;
    const moisture = this._programZoneMoisture(program, zone);
    const withMoisture = (minutes: number): number => {
      if (minutes <= 0 || moisture?.factor === 0) return 0;
      return Math.max(
        1,
        Math.min(180, Math.round(minutes * (moisture?.factor ?? 1))),
      );
    };
    if (zone.duration_mode !== "reference") {
      const factor = program.weather_adjustment ? (weather?.factor ?? 1) : 1;
      return withMoisture(
        factor <= 0 ? 0 : Math.max(1, Math.round(zone.duration_minutes * factor)),
      );
    }
    const profile = this._zoneProfile(zone.entity_id);
    if (!profile) return zone.duration_minutes;
    const temperature = weather?.max_temperature ?? 20;
    const targetMm =
      weather?.irrigation_target_mm ??
      (temperature >= 35 ? 9 : temperature >= 25 ? 5.5 : temperature >= 20 ? 4.5 : 2.5);
    const rainFactor = program.weather_adjustment
      ? (weather?.rain_factor ?? weather?.factor ?? 1)
      : 1;
    const exposureFactor = profile.exposure === "shady" ? 0.8 : 1;
    const minutes = Math.max(
      1,
      Math.min(
        180,
        Math.round(
          (targetMm * rainFactor * exposureFactor * 60) /
            this._effectiveRate(profile),
        ),
      ),
    );
    return withMoisture(minutes);
  }

  private _programZoneMoisture(
    program: Program,
    zone: ProgramZone,
  ): SoilMoisturePreview | null {
    if (!program.soil_moisture_enabled) return null;
    const profile = this._zoneProfile(zone.entity_id);
    if (!profile?.moisture_sensor_entity_id) return null;
    const settings = this._summary?.settings;
    if (!settings) return null;
    return soilMoisturePreview(profile.moisture_sensor_state, settings);
  }

  private _programZoneMoistureText(
    program: Program,
    zone: ProgramZone,
  ): string {
    const moisture = this._programZoneMoisture(program, zone);
    if (!moisture) return "";
    if (moisture.action === "skip") return `· ${moisture.percent}% → kihagyás`;
    return `· ${moisture.percent}% → ${Math.round(moisture.factor * 100)}%`;
  }

  private _allZones(): Zone[] {
    return this._summary?.controllers.flatMap((controller) => controller.zones) ?? [];
  }

  private _toggleController(controllerId: string): void {
    this._expandedControllers = this._expandedControllers.includes(controllerId)
      ? this._expandedControllers.filter((id) => id !== controllerId)
      : [...this._expandedControllers, controllerId];
  }

  private _newProgram = (): void => {
    this._draft = emptyProgram();
    this._tab = "programs";
    this._error = "";
  };

  private _resetManualProgram = (): void => {
    this._manualDraft = emptyManualProgram();
    this._error = "";
  };

  private _patchManual(patch: Partial<Program>): void {
    this._manualDraft = { ...this._manualDraft, ...patch };
  }

  private _importManualProgram = (event: Event): void => {
    const select = event.target as HTMLSelectElement;
    const source = this._summary?.programs.find(
      (program) => program.program_id === select.value,
    );
    if (!source) return;
    const now = emptyManualProgram();
    this._manualDraft = {
      ...now,
      name: `Kézi – ${source.name}`,
      weather_adjustment: source.weather_adjustment,
      soil_moisture_enabled: source.soil_moisture_enabled,
      zones: source.zones.map((zone) => ({ ...zone })),
    };
    select.value = "";
  };

  private _addManualZone = (event: Event): void => {
    const select = event.target as HTMLSelectElement;
    if (!select.value) return;
    this._patchManual({
      zones: [
        ...this._manualDraft.zones,
        {
          entity_id: select.value,
          duration_minutes: 15,
          duration_mode: "manual",
        },
      ],
    });
    select.value = "";
  };

  private _updateManualZone(index: number, zone: ProgramZone): void {
    const zones = [...this._manualDraft.zones];
    zones[index] = zone;
    this._patchManual({ zones });
  }

  private _removeManualZone(index: number): void {
    this._patchManual({
      zones: this._manualDraft.zones.filter(
        (_, zoneIndex) => zoneIndex !== index,
      ),
    });
  }

  private _moveManualZone(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this._manualDraft.zones.length) return;
    const zones = [...this._manualDraft.zones];
    [zones[index], zones[target]] = [zones[target]!, zones[index]!];
    this._patchManual({ zones });
  }

  private _runManualDraft = async (): Promise<void> => {
    if (
      !this.hass ||
      !this._manualDraft.zones.length ||
      this._manualRunning
    ) {
      return;
    }
    this._manualRunning = true;
    try {
      await runManualProgram(
        this.hass,
        this._manualDraft,
        this._manualDraft.weather_adjustment,
      );
      this._error = "";
      await this._load(false);
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._manualRunning = false;
    }
  };

  private _patchDraft(patch: Partial<Program>): void {
    if (!this._draft) return;
    this._draft = { ...this._draft, ...patch };
  }

  private _toggleDay(index: number): void {
    if (!this._draft) return;
    const weekdays = this._draft.weekdays.includes(index)
      ? this._draft.weekdays.filter((day) => day !== index)
      : [...this._draft.weekdays, index].sort();
    this._patchDraft({ weekdays });
  }

  private _addDraftZone = (event: Event): void => {
    if (!this._draft) return;
    const select = event.target as HTMLSelectElement;
    if (!select.value) return;
    this._patchDraft({
      zones: [
        ...this._draft.zones,
        {
          entity_id: select.value,
          duration_minutes: 15,
          duration_mode: "reference",
        },
      ],
    });
    select.value = "";
  };

  private _updateDraftZone(index: number, zone: ProgramZone): void {
    if (!this._draft) return;
    const zones = [...this._draft.zones];
    zones[index] = zone;
    this._patchDraft({ zones });
  }

  private _removeDraftZone(index: number): void {
    if (!this._draft) return;
    this._patchDraft({
      zones: this._draft.zones.filter((_, zoneIndex) => zoneIndex !== index),
    });
  }

  private _saveDraft = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (!this.hass || !this._draft) return;
    this._draft = normalizeProgram(this._draft);
    if (!this._draft.weekdays.length) {
      this._error = "Legalább egy napot válassz ki.";
      return;
    }
    if (!this._draft.zones.length) {
      this._error = "Adj legalább egy zónát a programhoz.";
      return;
    }
    if (this._isSmartProgram(this._draft)) {
      if (!this._draft.window_start_time || !this._draft.window_end_time) {
        this._error = "Add meg az öntözési időablak elejét és végét.";
        return;
      }
      const windowMinutes = this._windowDurationMinutes(this._draft);
      if (windowMinutes === 0) {
        this._error = "Az időablak kezdete és vége nem lehet azonos.";
        return;
      }
      if (windowMinutes < MIN_WINDOW_MINUTES) {
        this._error = `Az öntözési időablak legalább ${MIN_WINDOW_MINUTES} perces legyen.`;
        return;
      }
      if (windowMinutes > MAX_WINDOW_MINUTES) {
        this._error = "Az öntözési időablak legfeljebb 18 órás lehet.";
        return;
      }
    }
    this._saving = true;
    this._error = "";
    try {
      const saved = await saveProgram(this.hass, this._draft);
      await this._load(false);
      this._draft = cloneProgram(saved);
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._saving = false;
    }
  };

  private _deleteDraft = async (): Promise<void> => {
    if (!this.hass || !this._draft) return;
    const exists = this._summary?.programs.some(
      (program) => program.program_id === this._draft!.program_id,
    );
    if (!exists) {
      this._draft = null;
      return;
    }
    try {
      await deleteProgram(this.hass, this._draft.program_id);
      this._draft = null;
      await this._load(false);
      this._selectFirstProgram();
    } catch (error) {
      this._error = this._errorMessage(error);
    }
  };

  private _runDraft = async (draft: Program): Promise<void> => {
    if (!this.hass) return;
    this._saving = true;
    this._error = "";
    try {
      const saved = await saveAndRunProgram(this.hass, draft);
      this._draft = cloneProgram(saved);
      await this._load(false);
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._saving = false;
    }
  };

  private _quickToggleProgram = async (program: Program): Promise<void> => {
    if (!this.hass) return;
    try {
      await saveProgram(this.hass, { ...program, enabled: !program.enabled });
      await this._load(false);
    } catch (error) {
      this._error = this._errorMessage(error);
    }
  };

  private _startZone = async (zone: Zone): Promise<void> => {
    if (!this.hass) return;
    try {
      await runZone(
        this.hass,
        zone.entity_id,
        this._zoneDurations[zone.entity_id] ?? 15,
      );
      await this._load(false);
    } catch (error) {
      this._error = this._errorMessage(error);
    }
  };

  private _stopAll = async (): Promise<void> => {
    if (!this.hass) return;
    try {
      await stopAll(this.hass);
      await this._load(false);
    } catch (error) {
      this._error = this._errorMessage(error);
    }
  };

  private _skipCurrentZone = async (event: Event): Promise<void> => {
    event.stopPropagation();
    if (!this.hass) return;
    try {
      await skipCurrentZone(this.hass);
      await this._load(false);
    } catch (error) {
      this._error = this._errorMessage(error);
    }
  };

  private _toggleAutomation = async (): Promise<void> => {
    if (!this.hass || !this._summary) return;
    try {
      await setAutomation(this.hass, !this._summary.automation_enabled);
      await this._load(false);
    } catch (error) {
      this._error = this._errorMessage(error);
    }
  };

  private _patchSettings(patch: Partial<Settings>): void {
    if (!this._summary) return;
    this._settingsSaved = false;
    this._summary = {
      ...this._summary,
      settings: { ...this._summary.settings, ...patch },
    };
  }

  private _copyNtfyLink = async (): Promise<void> => {
    const link = this._summary?.settings.ntfy_link;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this._ntfyCopied = true;
      window.setTimeout(() => {
        this._ntfyCopied = false;
      }, 1600);
    } catch {
      this._error =
        "Nem sikerült automatikusan másolni. Jelöld ki a linket a mezőben.";
    }
  };

  private _patchZoneProfile(
    entityId: string,
    patch: Partial<ZoneProfile>,
  ): void {
    if (!this._summary) return;
    this._settingsSaved = false;
    this._summary = {
      ...this._summary,
      controllers: this._summary.controllers.map((controller) => ({
        ...controller,
        zones: controller.zones.map((zone) =>
          zone.entity_id === entityId
            ? { ...zone, profile: { ...zone.profile, ...patch } }
            : zone,
        ),
      })),
    };
  }

  private _assignMoistureSensorToAll(entityId: string): void {
    if (!entityId) return;
    for (const zone of this._allZones()) {
      this._patchZoneProfile(zone.entity_id, {
        moisture_sensor_entity_id: entityId,
      });
    }
  }

  private _moistureSensors(): Array<{ entity_id: string; name: string }> {
    return Object.entries(this.hass?.states ?? {})
      .filter(([entityId, state]) => {
        if (!entityId.startsWith("sensor.")) return false;
        const attributes = state.attributes;
        const deviceClass = String(attributes.device_class ?? "").toLowerCase();
        const name = String(attributes.friendly_name ?? entityId).toLowerCase();
        return (
          deviceClass === "moisture" ||
          name.includes("talajnedv") ||
          name.includes("soil moisture")
        );
      })
      .map(([entity_id, state]) => ({
        entity_id,
        name: String(state.attributes.friendly_name ?? entity_id),
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "hu"));
  }

  private _saveSettings = async (): Promise<void> => {
    if (!this.hass || !this._summary || this._settingsSaving) return;
    this._settingsSaving = true;
    this._settingsSaved = false;
    try {
      await updateSettings(this.hass, this._summary.settings);
      await updateZoneProfiles(
        this.hass,
        this._allZones().map((zone) => zone.profile),
      );
      await this._load(false);
      this._settingsSaved = true;
      this._error = "";
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._settingsSaving = false;
    }
  };

  private _searchRainStations = async (): Promise<void> => {
    if (!this.hass || !this._summary || this._rainStationSearching) return;
    const city = this._summary.settings.rain_station_city.trim();
    if (city.length < 2) return;
    this._rainStationSearching = true;
    try {
      const result = await searchRainStations(this.hass, city);
      this._rainStationMatches = result.stations;
      if (!result.stations.length) {
        this._error = `Nem található Időkép automata „${city}” közelében.`;
        return;
      }
      const selected =
        result.stations.find(
          (station) =>
            station.station_id === this._summary?.settings.rain_station_id,
        ) ?? result.stations[0];
      if (!selected) return;
      this._patchSettings({
        rain_station_id: selected.station_id,
        rain_station_name: selected.location,
      });
      this._error = "";
    } catch (error) {
      this._error = this._errorMessage(error);
    } finally {
      this._rainStationSearching = false;
    }
  };

  private _pauseDay = async (): Promise<void> => {
    if (!this.hass) return;
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await pauseUntil(this.hass, until);
    await this._load(false);
  };

  private _resume = async (): Promise<void> => {
    if (!this.hass) return;
    await pauseUntil(this.hass, null);
    await this._load(false);
  };

  private _formatDays(days: number[]): string {
    return days.map((day) => DAY_LONG[day] ?? "").join(", ");
  }

  private _isSmartProgram(program: Program): boolean {
    return (program.schedule_mode ?? "fixed") === "smart_window";
  }

  private _timeToMinutes(value: string): number | null {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  private _windowDurationMinutes(program: Program): number {
    const start = this._timeToMinutes(
      program.window_start_time ?? DEFAULT_WINDOW_START,
    );
    const end = this._timeToMinutes(
      program.window_end_time ?? DEFAULT_WINDOW_END,
    );
    if (start === null || end === null || start === end) return 0;
    return (end - start + 24 * 60) % (24 * 60);
  }

  private _programWindowLabel(program: Program): string {
    const start = program.window_start_time ?? DEFAULT_WINDOW_START;
    const end = program.window_end_time ?? DEFAULT_WINDOW_END;
    const startMinutes = this._timeToMinutes(start);
    const endMinutes = this._timeToMinutes(end);
    const overnight =
      startMinutes !== null && endMinutes !== null && endMinutes < startMinutes;
    return `${start}–${end}${overnight ? " (+1 nap)" : ""}`;
  }

  private _historyMoistureText(record: RunRecord): string {
    return record.zones
      .filter((zone) => typeof zone.moisture_percent === "number")
      .map((zone) => {
        const name = String(zone.name ?? zone.entity_id ?? "Zóna");
        const percent = Number(zone.moisture_percent);
        const adjustment =
          zone.moisture_action === "skip"
            ? "kimaradt"
            : `${Math.round(Number(zone.moisture_factor ?? 1) * 100)}% idő`;
        return `${name} ${this._formatForecastNumber(percent)}% → ${adjustment}`;
      })
      .join(" · ");
  }

  private _temperatureConditionText(program: Program): string {
    const relation =
      program.temperature_condition_operator === "above"
        ? "Max. hőmérséklet >"
        : "Max. hőmérséklet <";
    return `${relation} ${program.temperature_condition_value} °C`;
  }

  private _zoneProfile(entityId: string): ZoneProfile | undefined {
    return this._allZones().find((zone) => zone.entity_id === entityId)?.profile;
  }

  private _effectiveRate(profile: ZoneProfile): number {
    if (
      profile.flow_l_min !== null &&
      profile.area_m2 !== null &&
      profile.area_m2 > 0
    ) {
      return (profile.flow_l_min * 60) / profile.area_m2;
    }
    return profile.reference_rate_mm_h;
  }

  private _headLabel(headType: ZoneProfile["head_type"]): string {
    return HEAD_TYPES.find((item) => item.value === headType)?.label ?? headType;
  }

  private _formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  private _formatCalendarDate(value: string): string {
    return new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  }

  private _formatTime(value: string): string {
    return new Intl.DateTimeFormat("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  private _groupForecastDays(
    hours: HourlyForecastHour[],
  ): Array<{ date: string; hours: HourlyForecastHour[] }> {
    const grouped = new Map<string, HourlyForecastHour[]>();
    for (const hour of hours) {
      const date = new Date(hour.timestamp);
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      grouped.set(key, [...(grouped.get(key) ?? []), hour]);
    }
    return [...grouped].map(([date, dayHours]) => ({
      date,
      hours: dayHours,
    }));
  }

  private _formatForecastDate(value: string, index: number): string {
    const formatted = new Intl.DateTimeFormat("hu-HU", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T12:00:00`));
    const prefix = index === 0 ? "Ma" : index === 1 ? "Holnap" : "";
    return prefix ? `${prefix} · ${formatted}` : formatted;
  }

  private _formatForecastNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  private _formatOptionalMillimeters(value?: number | null): string {
    return value === null || value === undefined
      ? "nincs adat"
      : `${this._formatForecastNumber(value)} mm`;
  }

  private _forecastConditionLabel(condition: string): string {
    const labels: Record<string, string> = {
      sunny: "Napos",
      "clear-night": "Derült",
      partlycloudy: "Részben felhős",
      cloudy: "Felhős",
      rainy: "Esős",
      pouring: "Erős eső",
      "lightning-rainy": "Zivatar",
      lightning: "Villámlás",
      fog: "Ködös",
      windy: "Szeles",
      "windy-variant": "Szeles, felhős",
      hail: "Jégeső",
      snowy: "Havazás",
      "snowy-rainy": "Havas eső",
    };
    return labels[condition.toLowerCase()] ?? condition;
  }

  private _forecastConditionIcon(condition: string): string {
    const icons: Record<string, string> = {
      sunny: "mdi:weather-sunny",
      "clear-night": "mdi:weather-night",
      partlycloudy: "mdi:weather-partly-cloudy",
      cloudy: "mdi:weather-cloudy",
      rainy: "mdi:weather-rainy",
      pouring: "mdi:weather-pouring",
      "lightning-rainy": "mdi:weather-lightning-rainy",
      lightning: "mdi:weather-lightning",
      fog: "mdi:weather-fog",
      windy: "mdi:weather-windy",
      "windy-variant": "mdi:weather-windy-variant",
      hail: "mdi:weather-hail",
      snowy: "mdi:weather-snowy",
      "snowy-rainy": "mdi:weather-snowy-rainy",
    };
    return icons[condition.toLowerCase()] ?? "mdi:weather-cloudy-alert";
  }

  private _formatScheduleDate(value: string, index: number): string {
    const formatted = new Intl.DateTimeFormat("hu-HU", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T12:00:00`));
    const prefix = index === 0 ? "Ma" : index === 1 ? "Holnap" : "Holnapután";
    return `${prefix} · ${formatted}`;
  }

  private _isSmartScheduleProgram(program: ScheduleProgram): boolean {
    return (
      program.schedule_mode === "smart_window" ||
      program.planning_status?.startsWith("smart_") === true
    );
  }

  private _scheduleProgramTime(program: ScheduleProgram): string {
    if (this._isSmartScheduleProgram(program) && !program.planned_end_at) {
      return "Időablak";
    }
    return program.planned_end_at
      ? this._formatScheduleRange(program.scheduled_at, program.planned_end_at)
      : this._formatTime(program.scheduled_at);
  }

  private _formatScheduleRange(startValue: string, endValue: string): string {
    const start = new Date(startValue);
    const end = new Date(endValue);
    const crossesDate = start.toDateString() !== end.toDateString();
    return `${this._formatTime(startValue)}–${this._formatTime(endValue)}${
      crossesDate ? " (+1 nap)" : ""
    }`;
  }

  private _scheduleStatusLabel(program: ScheduleProgram): string {
    if (program.planning_status === "smart_no_fit") {
      return "Nincs megfelelő időpont";
    }
    if (program.planning_status === "smart_waiting_forecast") {
      return "Előrejelzésre vár";
    }
    if (
      program.status === "will_run" &&
      program.planning_status === "smart_planned"
    ) {
      return `Tervezve ${this._formatTime(program.scheduled_at)}-ra`;
    }
    const labels: Record<ScheduleProgram["status"], string> = {
      will_run: "Lefut",
      automation_off: "Automatika kikapcsolva",
      paused: "Szünetel",
      skip_next: "Kihagyva",
      weather_unavailable: "Nincs forecast",
      condition_skip: "Feltétel nem teljesül",
      rain_skip: "Eső miatt kimarad",
      moisture_skip: "Talajnedvesség miatt kimarad",
      wind_delayed: program.weather?.delayed_until
        ? `Halasztva ${this._formatTime(program.weather.delayed_until)}-ra`
        : "Szél miatt halasztva",
      wind_skip: "Szél miatt kimarad",
      wind_unavailable: "Széladat hiányzik",
      water_need_deferred: "Halasztva",
      water_balance_unavailable: "Vízmérleg helyreállítása szükséges",
      smart_no_fit: "Nincs megfelelő időpont",
      smart_zone_conflict: "Zónaütközés",
    };
    return labels[program.status];
  }

  private _formatWeatherWind(weather: WeatherDecision): string {
    const speed = weather.max_wind_speed_kmh;
    const gust = weather.max_wind_gust_kmh;
    if (speed === null || speed === undefined) return "nincs adat";
    const speedText = `${this._formatForecastNumber(speed)} km/h`;
    return gust === null || gust === undefined
      ? speedText
      : `${speedText} / ${this._formatForecastNumber(gust)} lökés`;
  }

  private _formatForecastWind(hour: HourlyForecastHour): string {
    if (hour.wind_speed_kmh === null && hour.wind_gust_kmh === null) {
      return "nincs adat";
    }
    const direction =
      hour.wind_bearing_deg === null
        ? ""
        : `${this._formatWindDirection(hour.wind_bearing_deg)} `;
    const speed =
      hour.wind_speed_kmh === null
        ? "–"
        : this._formatForecastNumber(hour.wind_speed_kmh);
    const gust =
      hour.wind_gust_kmh === null
        ? ""
        : ` / ${this._formatForecastNumber(hour.wind_gust_kmh)}`;
    return `${direction}${speed}${gust} km/h`;
  }

  private _formatWindDirection(degrees: number): string {
    const labels = ["É", "ÉK", "K", "DK", "D", "DNY", "NY", "ÉNY"];
    return labels[Math.round((degrees % 360) / 45) % labels.length]!;
  }

  private _formatRelative(value: string): string {
    const target = new Date(value);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const day =
      target.toDateString() === now.toDateString()
        ? "ma"
        : target.toDateString() === tomorrow.toDateString()
          ? "holnap"
          : new Intl.DateTimeFormat("hu-HU", {
              month: "short",
              day: "numeric",
            }).format(target);
    return `${day} ${target.toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  private _outcomeLabel(outcome: RunRecord["outcome"]): string {
    return (
      {
        completed: "Befejezve",
        skipped: "Kihagyva",
        failed: "Hiba",
        stopped: "Leállítva",
        interrupted: "Megszakítva",
      }[outcome] ?? outcome
    );
  }

  private _clampDuration(value: number): number {
    return Math.max(1, Math.min(180, Number.isFinite(value) ? Math.round(value) : 15));
  }

  private _errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
    return "A művelet nem sikerült.";
  }
}

if (!customElements.get("smart-yardian-panel")) {
  customElements.define("smart-yardian-panel", SmartYardianPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    "smart-yardian-panel": SmartYardianPanel;
  }
}
