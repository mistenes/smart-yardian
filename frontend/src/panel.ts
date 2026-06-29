import { LitElement, html, nothing, type TemplateResult } from "lit";
import {
  deleteProgram,
  getSummary,
  pauseUntil,
  previewSchedule,
  previewWeather,
  runProgram,
  runZone,
  saveProgram,
  setAutomation,
  stopAll,
  updateSettings,
  updateZoneProfiles,
} from "./api";
import { createProgramId } from "./ids";
import { panelStyles } from "./styles";
import type {
  Hass,
  Program,
  ProgramZone,
  RunRecord,
  SchedulePreview,
  ScheduleProgram,
  Settings,
  Summary,
  WeatherDecision,
  Zone,
  ZoneProfile,
} from "./types";

type Tab = "overview" | "schedule" | "programs" | "history" | "settings";

const DAY_NAMES = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const DAY_LONG = ["Hé", "Ke", "Sze", "Csü", "Pén", "Szo", "Vas"];
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
  start_time: "05:30",
  weather_adjustment: true,
  temperature_condition_enabled: false,
  temperature_condition_operator: "above",
  temperature_condition_value: 30,
  soil_moisture_enabled: false,
  zones: [],
  skip_next: false,
});

const cloneProgram = (program: Program): Program =>
  JSON.parse(JSON.stringify(program)) as Program;

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
    _bulkMoistureSensor: { state: true },
    _settingsSaving: { state: true },
    _settingsSaved: { state: true },
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
  private _bulkMoistureSensor = "";
  private _settingsSaving = false;
  private _settingsSaved = false;
  private _timer?: number;

  connectedCallback(): void {
    super.connectedCallback();
    void this._load(true);
    this._timer = window.setInterval(() => {
      if (this._tab !== "settings" && this._tab !== "schedule") {
        void this._load(false);
      }
    }, 5000);
  }

  disconnectedCallback(): void {
    if (this._timer) window.clearInterval(this._timer);
    super.disconnectedCallback();
  }

  protected render(): TemplateResult {
    return html`
      <div class="shell">
        <header class="topbar">
          <ha-icon icon="mdi:water"></ha-icon>
          <h1>Öntözés</h1>
        </header>
        <nav class="tabs" aria-label="Öntözés nézetek">
          ${this._tabButton("overview", "Áttekintés")}
          ${this._tabButton("schedule", "Következő 3 nap")}
          ${this._tabButton("programs", "Programok")}
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
        ${summary.next_run
          ? html`
              <span>Következő:</span>
              <span class="linklike">${this._nextProgramName()}</span>
              <span>· ${this._formatRelative(summary.next_run)}</span>
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

      <button class="button danger stop-all" @click=${this._stopAll}>
        <ha-icon icon="mdi:stop"></ha-icon>
        Minden leállítása
      </button>
    `;
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
        ${this._metric("mdi:weather-rainy", "Várható eső", `${weather.precipitation_mm ?? 0} mm`)}
        ${this._metric("mdi:water-percent", "Esély", `${weather.max_probability ?? 0}%`)}
        ${this._metric("mdi:white-balance-sunny", "Napos órák", `${weather.sunny_hours ?? 0}`, "sun")}
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
    return html`
      <div class="program-rail-item">
        <div class="program-line">
          <ha-icon icon=${program.start_time < "12:00" ? "mdi:weather-sunset-up" : "mdi:weather-night"}></ha-icon>
          <strong>${program.name}</strong>
          <button
            class="toggle"
            ?on=${program.enabled}
            aria-label="${program.name} engedélyezése"
            @click=${() => this._quickToggleProgram(program)}
          ></button>
        </div>
        <div class="program-details">
          <div>Napok: ${this._formatDays(program.weekdays)}</div>
          <div>Kezdés: ${program.start_time}</div>
          ${program.temperature_condition_enabled
            ? html`<div>${this._temperatureConditionText(program)}</div>`
            : nothing}
          <div>Számított öntözési idő: ${total} perc</div>
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

  private _renderSchedule(): TemplateResult {
    const preview = this._schedulePreview;
    return html`
      <div class="page-head">
        <div>
          <h2>Következő 3 nap</h2>
          <div class="subtle">
            A forrás programonként eltérhet: elsőként mindig az Időképet
            használjuk, és csak akkor váltunk OpenWeatherre, ha az adott
            futástól nincs legalább 12 órányi Időkép-előrejelzés.
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
    const runnable = program.status === "will_run";
    return html`
      <article class="schedule-program" ?runnable=${runnable}>
        <div class="schedule-program-head">
          <time>${this._formatTime(program.scheduled_at)}</time>
          <strong>${program.program_name}</strong>
          <span class="schedule-status ${program.status}">
            ${this._scheduleStatusLabel(program.status)}
          </span>
        </div>
        <div class="schedule-reason">${program.reason}</div>
        ${program.weather
          ? html`
              <div class="schedule-weather">
                <span>${program.weather.max_temperature ?? "–"} °C max.</span>
                <span>${program.weather.precipitation_mm ?? 0} mm eső</span>
                <span>Forrás: ${program.weather.source}</span>
              </div>
            `
          : nothing}
        <div class="schedule-zones">
          ${program.zones.map(
            (zone) => html`
              <div>
                <span>${zone.name}</span>
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
                    <span>${this._formatDays(program.weekdays)} · ${program.start_time}</span>
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
          <span class="field-label">Napok</span>
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
        </div>
        <div class="field">
          <label for="program-start">Kezdés</label>
          <input
            id="program-start"
            type="time"
            required
            .value=${draft.start_time}
            @input=${(event: Event) =>
              this._patchDraft({ start_time: (event.target as HTMLInputElement).value })}
          />
        </div>
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
                programzónához van érzékelő rendelve. A kihagyási küszöböt a
                következő fejlesztési lépésben lehet majd megadni.
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
                    <option value="manual">Manuális perc</option>
                    <option value="reference">Referencia alapján</option>
                  </select>
                  ${zone.duration_mode === "reference"
                    ? html`
                        <span class="calculated-duration">
                          ≈ ${this._programZoneMinutes(draft, zone)} perc
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
                        <td class="reason-cell">${record.reason}</td>
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
          <div class="setting-row">
            <span>OpenWeather API-hívások ma</span>
            <strong>
              ${this._summary!.openweather_quota
                ? `${this._summary!.openweather_quota.count} / ${this._summary!.openweather_quota.limit}`
                : "Nincs adat"}
            </strong>
          </div>
        </section>
      </div>
      <section class="settings-section zone-profiles">
        <h3>Zónák vízigénye, szórófeje és érzékelője</h3>
        <p class="settings-help">
          Referencia módban a program a célzott vízmennyiséget osztja a kijuttatási
          intenzitással. Ha a teljes zónavízhozam és a terület is ki van töltve,
          azok felülírják a fejtípus referenciaértékét. Az árnyékos terület 20%-kal
          rövidebb referenciaidőt kap. Egy talajnedvességmérő több zónához is
          hozzárendelhető; az automatikus kihagyási küszöb egy következő lépésben
          kapcsolható rá biztonságosan.
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
  ): TemplateResult {
    return html`
      <label class="setting-row">
        <span>${label}</span>
        <input
          type="number"
          step="0.1"
          .value=${String(settings[key])}
          @change=${(event: Event) =>
            this._patchSettings({
              [key]: (event.target as HTMLInputElement).valueAsNumber,
            } as Partial<Settings>)}
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
      this._summary = summary;
      if (!this._expandedControllers.length && summary.controllers[0]) {
        this._expandedControllers = [summary.controllers[0].id];
      }
      this._error = "";
      if (!summary.weather && initial) {
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

  private _selectFirstProgram(): void {
    const first = this._summary?.programs[0];
    this._draft = first ? cloneProgram(first) : null;
  }

  private _nextProgramName(): string {
    if (!this._summary?.next_run) return "";
    const target = new Date(this._summary.next_run);
    return (
      this._summary.programs.find((program) => {
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
    if (zone.duration_mode !== "reference") {
      const factor = program.weather_adjustment ? (weather?.factor ?? 1) : 1;
      return Math.max(1, Math.round(zone.duration_minutes * factor));
    }
    const profile = this._zoneProfile(zone.entity_id);
    if (!profile) return zone.duration_minutes;
    const temperature = weather?.max_temperature ?? 20;
    const targetMm =
      temperature >= 35 ? 9 : temperature >= 25 ? 5.5 : temperature >= 20 ? 4.5 : 2.5;
    const rainFactor = program.weather_adjustment
      ? (weather?.rain_factor ?? weather?.factor ?? 1)
      : 1;
    const exposureFactor = profile.exposure === "shady" ? 0.8 : 1;
    return Math.max(
      1,
      Math.min(
        180,
        Math.round(
          (targetMm * rainFactor * exposureFactor * 60) /
            this._effectiveRate(profile),
        ),
      ),
    );
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
    if (!this._draft.weekdays.length) {
      this._error = "Legalább egy napot válassz ki.";
      return;
    }
    if (!this._draft.zones.length) {
      this._error = "Adj legalább egy zónát a programhoz.";
      return;
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
    try {
      const exists = this._summary?.programs.some(
        (program) => program.program_id === draft.program_id,
      );
      if (!exists) {
        this._error = "A programot futtatás előtt mentsd el.";
        return;
      }
      await runProgram(this.hass, draft.program_id);
      await this._load(false);
    } catch (error) {
      this._error = this._errorMessage(error);
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

  private _formatTime(value: string): string {
    return new Intl.DateTimeFormat("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
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

  private _scheduleStatusLabel(status: ScheduleProgram["status"]): string {
    const labels: Record<ScheduleProgram["status"], string> = {
      will_run: "Lefut",
      automation_off: "Automatika kikapcsolva",
      paused: "Szünetel",
      skip_next: "Kihagyva",
      weather_unavailable: "Nincs forecast",
      condition_skip: "Feltétel nem teljesül",
      rain_skip: "Eső miatt kimarad",
    };
    return labels[status];
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
