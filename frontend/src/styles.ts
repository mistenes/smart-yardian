import { css } from "lit";

export const panelStyles = css`
  :host {
    --sy-blue: var(--primary-color, #1688e8);
    --sy-blue-soft: color-mix(in srgb, var(--sy-blue) 9%, white);
    --sy-green: #2e9637;
    --sy-amber: #e79a09;
    --sy-amber-soft: #fffaf0;
    --sy-red: #df2f2f;
    --sy-text: var(--primary-text-color, #20252b);
    --sy-muted: var(--secondary-text-color, #697078);
    --sy-border: var(--divider-color, #dfe3e7);
    --sy-surface: var(--card-background-color, #ffffff);
    --sy-background: var(--primary-background-color, #ffffff);
    display: block;
    min-height: 100%;
    color: var(--sy-text);
    background: var(--sy-background);
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    font-size: 14px;
  }

  * {
    box-sizing: border-box;
  }

  button,
  input,
  select {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--sy-blue);
    outline-offset: 2px;
  }

  .shell {
    min-height: 100vh;
    background: var(--sy-surface);
  }

  .topbar {
    min-height: 64px;
    padding: 0 26px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--sy-border);
  }

  .topbar ha-icon {
    color: var(--sy-blue);
    --mdc-icon-size: 25px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 500;
    line-height: 1.2;
  }

  .tabs {
    height: 52px;
    padding: 0 26px;
    display: flex;
    align-items: stretch;
    gap: 32px;
    border-bottom: 1px solid var(--sy-border);
  }

  .tab {
    padding: 0;
    color: var(--sy-text);
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    font-size: 14px;
    font-weight: 500;
  }

  .tab[selected] {
    color: var(--sy-blue);
    border-bottom-color: var(--sy-blue);
  }

  .content {
    width: min(100%, 1280px);
    margin: 0 auto;
    padding: 24px 26px 28px;
  }

  .automation {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }

  .automation-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: white;
    background: var(--sy-green);
  }

  .automation-icon[off] {
    background: var(--sy-muted);
  }

  .automation-icon ha-icon {
    --mdc-icon-size: 27px;
  }

  .automation-copy {
    flex: 1;
    min-width: 0;
  }

  .automation-title {
    color: var(--sy-green);
    font-size: 23px;
    font-weight: 500;
    line-height: 1.2;
  }

  .automation-title[off] {
    color: var(--sy-muted);
  }

  .subtle {
    margin-top: 3px;
    color: var(--sy-muted);
    font-size: 13px;
  }

  .toggle {
    position: relative;
    width: 38px;
    height: 22px;
    flex: 0 0 auto;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: #a9afb5;
  }

  .toggle::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    transition: left 140ms ease;
  }

  .toggle[on] {
    background: var(--sy-blue);
  }

  .toggle[on]::after {
    left: 19px;
  }

  .weather-band {
    min-height: 92px;
    display: grid;
    grid-template-columns: minmax(270px, 1fr) repeat(4, minmax(100px, auto));
    align-items: center;
    border: 1px solid #efb132;
    border-radius: 8px;
    background: var(--sy-amber-soft);
    overflow: hidden;
  }

  .weather-summary {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
  }

  .weather-summary > ha-icon {
    color: var(--sy-amber);
    --mdc-icon-size: 39px;
  }

  .decision {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.25;
  }

  .weather-reason {
    margin-top: 5px;
    color: var(--sy-muted);
    line-height: 1.35;
  }

  .metric {
    min-height: 54px;
    padding: 2px 16px;
    display: grid;
    grid-template-columns: 25px auto;
    align-content: center;
    gap: 2px 9px;
    border-left: 1px solid #ecd7a7;
  }

  .metric ha-icon {
    grid-row: 1 / 3;
    align-self: center;
    color: var(--sy-blue);
    --mdc-icon-size: 24px;
  }

  .metric.sun ha-icon {
    color: var(--sy-amber);
  }

  .metric.temp ha-icon {
    color: var(--sy-red);
  }

  .metric-label {
    color: var(--sy-muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .metric-value {
    font-size: 18px;
    font-weight: 600;
    white-space: nowrap;
  }

  .next-run {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--sy-text);
  }

  .next-run ha-icon {
    color: var(--sy-blue);
  }

  .linklike {
    color: var(--sy-blue);
    font-weight: 500;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 292px;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .controllers {
    min-width: 0;
  }

  .controller + .controller {
    border-top: 1px solid var(--sy-border);
  }

  .controller-head {
    width: 100%;
    min-height: 66px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--sy-text);
    text-align: left;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--sy-border);
  }

  .controller-head > div:nth-child(2) {
    flex: 1;
  }

  .controller-chevron {
    color: var(--sy-muted);
  }

  .controller-mark {
    width: 40px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid #bfc5ca;
    border-radius: 7px;
    background: #edf0f1;
    color: #677078;
  }

  .controller-name {
    font-size: 17px;
    font-weight: 600;
  }

  .controller-meta {
    margin-top: 3px;
    color: var(--sy-muted);
    font-size: 12px;
  }

  .online {
    color: var(--sy-green);
  }

  .partial {
    color: var(--sy-amber);
    font-weight: 600;
  }

  .offline {
    color: var(--sy-red);
    font-weight: 600;
  }

  .zone-row {
    min-height: 56px;
    padding: 0 12px 0 18px;
    display: grid;
    grid-template-columns: 30px minmax(120px, 1fr) minmax(128px, 180px) 80px 88px;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--sy-border);
  }

  .zone-row:last-child {
    border-bottom: 0;
  }

  .zone-row ha-icon {
    color: var(--sy-blue);
    --mdc-icon-size: 19px;
  }

  .zone-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .zone-state {
    color: var(--sy-muted);
    font-size: 12px;
    line-height: 1.25;
  }

  .zone-state[running] {
    color: var(--sy-green);
    font-weight: 600;
  }

  .zone-state[unavailable] {
    color: var(--sy-red);
    font-weight: 600;
  }

  .zone-state small {
    display: block;
    color: var(--sy-muted);
    font-weight: 500;
    margin-top: 2px;
  }

  .duration {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .duration input {
    width: 48px;
    height: 31px;
    padding: 0 6px;
    border: 1px solid var(--sy-border);
    border-radius: 6px;
    color: var(--sy-text);
    background: var(--sy-surface);
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .duration input::-webkit-inner-spin-button,
  .duration input::-webkit-outer-spin-button {
    margin: 0;
    appearance: none;
  }

  .duration span {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .button {
    min-height: 34px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    color: var(--sy-blue);
    background: var(--sy-surface);
    border: 1px solid var(--sy-blue);
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
  }

  .button.primary {
    color: white;
    background: var(--sy-blue);
  }

  .button.danger {
    color: var(--sy-red);
    border-color: var(--sy-red);
  }

  .button.quiet {
    color: var(--sy-text);
    border-color: var(--sy-border);
  }

  .button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .rail {
    padding: 0 14px;
    border-left: 1px solid var(--sy-border);
  }

  .rail-title,
  .section-head {
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--sy-border);
    font-size: 15px;
    font-weight: 600;
  }

  .text-action {
    padding: 5px 0;
    color: var(--sy-blue);
    background: none;
    border: 0;
    font-size: 12px;
    font-weight: 600;
  }

  .program-rail-item {
    padding: 14px 0;
    border-bottom: 1px solid var(--sy-border);
  }

  .program-line {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .program-line ha-icon {
    color: var(--sy-amber);
    --mdc-icon-size: 20px;
  }

  .program-line strong {
    flex: 1;
  }

  .program-details {
    margin: 9px 0 0 28px;
    color: var(--sy-muted);
    font-size: 12px;
    line-height: 1.65;
  }

  .history-compact {
    padding: 14px 0 18px;
  }

  .history-compact-title {
    margin-bottom: 9px;
    font-weight: 600;
  }

  .history-reason {
    margin-top: 4px;
    color: var(--sy-red);
    font-size: 12px;
  }

  .stop-all {
    width: 100%;
    min-height: 48px;
    margin-top: 18px;
  }

  .page-head {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--sy-border);
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .schedule-days {
    padding-top: 18px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }

  .schedule-day {
    min-width: 0;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .schedule-day-head {
    min-height: 48px;
    padding: 9px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--sy-border);
    background: color-mix(in srgb, var(--sy-surface) 94%, var(--sy-text));
  }

  .schedule-day-head strong {
    text-transform: capitalize;
  }

  .schedule-day-head span {
    color: var(--sy-muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .schedule-program {
    padding: 12px;
    border-bottom: 1px solid var(--sy-border);
    box-shadow: inset 3px 0 0 var(--sy-amber);
  }

  .schedule-program[runnable] {
    box-shadow: inset 3px 0 0 var(--sy-green);
  }

  .schedule-program:last-child {
    border-bottom: 0;
  }

  .schedule-program-head {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 8px;
  }

  .schedule-program-head time {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .schedule-status {
    color: var(--sy-amber);
    font-size: 11px;
    font-weight: 600;
    text-align: right;
  }

  .schedule-status.will_run {
    color: var(--sy-green);
  }

  .schedule-status.weather_unavailable {
    color: var(--sy-red);
  }

  .schedule-reason {
    margin: 7px 0 8px 52px;
    color: var(--sy-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .schedule-weather {
    margin: 0 0 9px 52px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px 12px;
    color: var(--sy-muted);
    font-size: 11px;
  }

  .schedule-zones {
    border-top: 1px solid var(--sy-border);
  }

  .schedule-zones > div,
  .schedule-total {
    min-height: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--sy-border);
    font-size: 12px;
  }

  .schedule-zones > div strong {
    white-space: nowrap;
  }

  .schedule-total {
    border-bottom: 0;
    font-size: 13px;
  }

  .schedule-empty {
    min-height: 100px;
    padding: 28px 14px;
    display: grid;
    place-items: center;
    color: var(--sy-muted);
    text-align: center;
    font-size: 12px;
  }

  .schedule-generated {
    margin-top: 12px;
    color: var(--sy-muted);
    font-size: 11px;
    text-align: right;
  }

  .program-workspace {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    min-height: 620px;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .program-list {
    border-right: 1px solid var(--sy-border);
  }

  .program-list-item {
    width: 100%;
    padding: 14px 16px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 5px 12px;
    text-align: left;
    color: var(--sy-text);
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--sy-border);
  }

  .program-list-item[selected] {
    background: var(--sy-blue-soft);
    box-shadow: inset 3px 0 0 var(--sy-blue);
  }

  .program-list-item strong {
    font-size: 14px;
  }

  .program-list-item span {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .editor {
    padding: 22px 24px 28px;
  }

  .field {
    margin-bottom: 18px;
  }

  .field label,
  .field-label {
    display: block;
    margin-bottom: 7px;
    font-size: 13px;
    font-weight: 600;
  }

  .field input[type="text"],
  .field input[type="time"],
  .field input[type="number"],
  .field select {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-radius: 7px;
  }

  .days {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .day {
    min-width: 42px;
    height: 36px;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-radius: 7px;
  }

  .day[selected] {
    color: white;
    background: var(--sy-blue);
    border-color: var(--sy-blue);
  }

  .editor-zones {
    border: 1px solid var(--sy-border);
    border-radius: 7px;
    overflow: hidden;
  }

  .editor-zone {
    min-height: 49px;
    padding: 6px 9px;
    display: grid;
    grid-template-columns: minmax(140px, 1fr) 170px 110px 34px;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--sy-border);
  }

  .editor-zone:last-child {
    border-bottom: 0;
  }

  .editor-zone select {
    min-height: 34px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .editor-duration {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .editor-duration input {
    width: 65px;
  }

  .editor-duration span,
  .calculated-duration {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .icon-button {
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--sy-muted);
    background: transparent;
    border: 0;
  }

  .icon-button ha-icon {
    --mdc-icon-size: 20px;
  }

  .checkline {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 12px 0;
  }

  .temperature-condition {
    margin: 8px 0 18px 25px;
    display: grid;
    grid-template-columns: minmax(190px, 1fr) 150px 105px;
    align-items: center;
    gap: 8px;
    color: var(--sy-muted);
    font-size: 13px;
  }

  .temperature-condition select,
  .temperature-condition input {
    width: 100%;
    min-height: 36px;
    padding: 6px 8px;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .temperature-condition label {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
  }

  .editor-actions {
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .editor-actions > div {
    display: flex;
    gap: 8px;
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 12px 14px;
    text-align: left;
    border-bottom: 1px solid var(--sy-border);
    white-space: nowrap;
  }

  th {
    color: var(--sy-muted);
    background: color-mix(in srgb, var(--sy-surface) 92%, var(--sy-text));
    font-size: 12px;
    font-weight: 600;
  }

  td.reason-cell {
    min-width: 280px;
    white-space: normal;
  }

  .outcome {
    font-weight: 600;
  }

  .outcome.completed {
    color: var(--sy-green);
  }

  .outcome.failed,
  .outcome.interrupted {
    color: var(--sy-red);
  }

  .outcome.skipped,
  .outcome.stopped {
    color: var(--sy-amber);
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 28px;
    padding-top: 20px;
  }

  .settings-section {
    margin-bottom: 24px;
  }

  .settings-section h3 {
    margin: 0 0 14px;
    padding-bottom: 9px;
    border-bottom: 1px solid var(--sy-border);
    font-size: 16px;
  }

  .setting-row {
    min-height: 49px;
    display: grid;
    grid-template-columns: 1fr 100px;
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid var(--sy-border);
  }

  .setting-row input {
    width: 100%;
    height: 34px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .zone-profiles {
    margin-top: 6px;
  }

  .settings-help {
    max-width: 850px;
    margin: -4px 0 16px;
    color: var(--sy-muted);
    line-height: 1.45;
  }

  .zone-profile-head,
  .zone-profile-row {
    display: grid;
    grid-template-columns:
      minmax(145px, 1.2fr) minmax(135px, 0.9fr) minmax(115px, 0.75fr)
      minmax(110px, 0.7fr) minmax(110px, 0.7fr) minmax(100px, 0.65fr)
      minmax(180px, 1.2fr) minmax(125px, 0.8fr);
    align-items: center;
    gap: 12px;
  }

  .moisture-bulk {
    display: flex;
    align-items: end;
    gap: 10px;
    margin: 0 0 16px;
    padding: 12px;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
    background: var(--sy-surface);
  }

  .moisture-bulk label {
    display: grid;
    flex: 1;
    max-width: 460px;
    gap: 6px;
    color: var(--sy-muted);
    font-size: 12px;
  }

  .moisture-bulk select {
    height: 36px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .zone-profile-head {
    min-height: 36px;
    color: var(--sy-muted);
    border-bottom: 1px solid var(--sy-border);
    font-size: 12px;
    font-weight: 600;
  }

  .zone-profile-row {
    min-height: 58px;
    border-bottom: 1px solid var(--sy-border);
  }

  .zone-profile-row select,
  .zone-profile-row input {
    width: 100%;
    height: 34px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .profile-number {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 5px;
  }

  .profile-number > span:last-child,
  .effective-rate > span {
    color: var(--sy-muted);
    font-size: 11px;
  }

  .effective-rate {
    display: grid;
    gap: 2px;
  }

  .moisture-select {
    display: grid;
    gap: 3px;
  }

  .sensor-reading {
    color: var(--sy-muted);
    font-size: 11px;
  }

  .mobile-label {
    display: none;
  }

  .empty,
  .loading,
  .error {
    padding: 32px;
    color: var(--sy-muted);
    text-align: center;
  }

  .error {
    color: var(--sy-red);
  }

  @media (max-width: 900px) {
    .content {
      padding: 18px 14px 90px;
    }

    .topbar,
    .tabs {
      padding-left: 16px;
      padding-right: 16px;
    }

    .tabs {
      gap: 22px;
      overflow-x: auto;
    }

    .weather-band {
      grid-template-columns: repeat(4, 1fr);
    }

    .weather-summary {
      grid-column: 1 / -1;
      border-bottom: 1px solid #ecd7a7;
    }

    .metric {
      min-height: 59px;
      padding: 5px 9px;
    }

    .overview-grid {
      display: block;
    }

    .rail {
      border-top: 1px solid var(--sy-border);
      border-left: 0;
    }

    .program-workspace {
      grid-template-columns: 1fr;
    }

    .schedule-days {
      grid-template-columns: 1fr;
    }

    .program-list {
      max-height: 240px;
      overflow-y: auto;
      border-right: 0;
      border-bottom: 1px solid var(--sy-border);
    }

    .settings-grid {
      grid-template-columns: 1fr;
    }

    .zone-profile-head {
      display: none;
    }

    .zone-profile-row {
      padding: 14px 0;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 14px;
    }

    .zone-profile-row > strong,
    .effective-rate {
      grid-column: 1 / -1;
    }

    .moisture-bulk {
      align-items: stretch;
      flex-direction: column;
    }

    .moisture-bulk label {
      max-width: none;
    }

    .mobile-label {
      display: block;
      margin-bottom: 5px;
      color: var(--sy-muted);
      font-size: 11px;
    }

    .profile-number {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .profile-number .mobile-label {
      grid-column: 1 / -1;
    }

    .stop-all {
      position: fixed;
      z-index: 4;
      left: 14px;
      right: 14px;
      bottom: 12px;
      width: auto;
      margin: 0;
      background: var(--sy-surface);
      box-shadow: 0 2px 8px rgb(0 0 0 / 14%);
    }
  }

  @media (max-width: 600px) {
    .topbar {
      min-height: 54px;
    }

    h1 {
      font-size: 20px;
    }

    .automation-title {
      font-size: 18px;
    }

    .weather-summary {
      padding: 14px;
    }

    .decision {
      font-size: 17px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-align: center;
    }

    .metric ha-icon {
      display: none;
    }

    .metric-label {
      font-size: 10px;
    }

    .metric-value {
      font-size: 14px;
    }

    .zone-row {
      min-height: 42px;
      grid-template-columns: 22px minmax(90px, 1fr) 52px 38px;
      gap: 6px;
      padding-left: 10px;
      font-size: 13px;
    }

    .controller-head {
      min-height: 58px;
    }

    .controller[collapsed] .zone-row {
      display: none;
    }

    .zone-state {
      display: none;
    }

    .duration input {
      width: 44px;
      height: 30px;
    }

    .duration span {
      display: none;
    }

    .zone-row .button {
      width: 36px;
      min-width: 36px;
      padding: 0;
      font-size: 0;
    }

    .zone-row .button ha-icon {
      --mdc-icon-size: 18px;
    }

    .editor-zone {
      grid-template-columns: minmax(0, 1fr) 34px;
      padding: 10px;
    }

    .schedule-program-head {
      grid-template-columns: 42px minmax(0, 1fr);
    }

    .schedule-status {
      grid-column: 2;
      text-align: left;
    }

    .schedule-reason,
    .schedule-weather {
      margin-left: 50px;
    }

    .temperature-condition {
      margin-left: 0;
      grid-template-columns: 1fr;
    }

    .editor-zone > select,
    .editor-zone > .editor-duration,
    .editor-zone > .calculated-duration {
      grid-column: 1 / -1;
    }

    .editor-zone > .icon-button {
      grid-column: 2;
      grid-row: 1;
    }

    .zone-profile-row {
      grid-template-columns: 1fr;
    }

    .zone-profile-row > strong,
    .effective-rate {
      grid-column: 1;
    }

    .editor {
      padding: 18px 14px;
    }

    .editor-zone {
      grid-template-columns: minmax(110px, 1fr) 70px 32px;
    }

    .editor-actions {
      align-items: stretch;
      flex-direction: column-reverse;
    }

    .editor-actions > div {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .page-head {
      align-items: flex-start;
      flex-direction: column;
      padding-bottom: 12px;
    }
  }
`;
