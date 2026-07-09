import { css } from "lit";

export const panelStyles = css`
  :host {
    --sy-blue: var(--primary-color, #1688e8);
    --sy-green: var(--success-color, #2e9637);
    --sy-amber: var(--warning-color, #c98200);
    --sy-red: var(--error-color, #df2f2f);
    --sy-text: var(--primary-text-color, #20252b);
    --sy-muted: var(--secondary-text-color, #697078);
    --sy-disabled: var(--disabled-text-color, #8b9298);
    --sy-border: var(--divider-color, #dfe3e7);
    --sy-surface: var(--card-background-color, #ffffff);
    --sy-background: var(--primary-background-color, #f4f6f8);
    --sy-surface-muted: var(
      --secondary-background-color,
      color-mix(in srgb, var(--sy-surface) 94%, var(--sy-text))
    );
    --sy-control: var(--input-fill-color, var(--sy-surface));
    --sy-control-hover: color-mix(in srgb, var(--sy-blue) 7%, var(--sy-control));
    --sy-hover: color-mix(in srgb, var(--sy-text) 6%, transparent);
    --sy-blue-soft: color-mix(in srgb, var(--sy-blue) 13%, var(--sy-surface));
    --sy-green-soft: color-mix(in srgb, var(--sy-green) 13%, var(--sy-surface));
    --sy-amber-soft: color-mix(in srgb, var(--sy-amber) 13%, var(--sy-surface));
    --sy-red-soft: color-mix(in srgb, var(--sy-red) 12%, var(--sy-surface));
    --sy-on-accent: var(--text-primary-color, #ffffff);
    --sy-toggle-knob: #ffffff;
    --sy-shadow: rgb(0 0 0 / 18%);
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
    color-scheme: inherit;
  }

  button {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      color 140ms ease,
      opacity 140ms ease;
  }

  input::placeholder {
    color: var(--sy-muted);
    opacity: 0.85;
  }

  input:disabled,
  select:disabled {
    cursor: not-allowed;
    color: var(--sy-disabled);
    background: var(--sy-surface-muted);
    opacity: 1;
  }

  input:not(:disabled):hover,
  select:not(:disabled):hover {
    border-color: color-mix(in srgb, var(--sy-blue) 55%, var(--sy-border));
    background: var(--sy-control-hover);
  }

  select {
    accent-color: var(--sy-blue);
  }

  input[type="checkbox"],
  input[type="radio"] {
    accent-color: var(--sy-blue);
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
    color-scheme: light;
  }

  .shell[dark] {
    --sy-control: var(--input-fill-color, var(--sy-surface-muted));
    --sy-control-hover: color-mix(in srgb, var(--sy-blue) 15%, var(--sy-control));
    --sy-hover: color-mix(in srgb, var(--sy-text) 10%, transparent);
    --sy-blue-soft: color-mix(in srgb, var(--sy-blue) 20%, var(--sy-surface));
    --sy-green-soft: color-mix(in srgb, var(--sy-green) 18%, var(--sy-surface));
    --sy-amber-soft: color-mix(in srgb, var(--sy-amber) 18%, var(--sy-surface));
    --sy-red-soft: color-mix(in srgb, var(--sy-red) 18%, var(--sy-surface));
    --sy-on-accent: #07131f;
    --sy-shadow: rgb(0 0 0 / 42%);
    color-scheme: dark;
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

  .tab:hover:not([selected]),
  .controller-head:hover,
  .program-list-item:hover:not([selected]),
  .active-run-summary:hover {
    background: var(--sy-hover);
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
    color: var(--sy-on-accent);
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
    background: var(--sy-disabled);
  }

  .toggle::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--sy-toggle-knob);
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
    grid-template-columns: minmax(270px, 1fr) repeat(7, minmax(88px, auto));
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--sy-amber) 72%, var(--sy-border));
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
    border-left: 1px solid color-mix(in srgb, var(--sy-amber) 32%, var(--sy-border));
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

  .metric.et ha-icon {
    color: var(--sy-blue);
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
    border: 1px solid var(--sy-border);
    border-radius: 7px;
    background: var(--sy-surface-muted);
    color: var(--sy-muted);
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
    background: var(--sy-control);
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
    background: var(--sy-control);
    border: 1px solid var(--sy-blue);
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
  }

  .button.primary {
    color: var(--sy-on-accent);
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
    color: var(--sy-disabled);
    background: var(--sy-surface-muted);
    border-color: var(--sy-border);
    opacity: 0.72;
  }

  .button:hover:not(:disabled) {
    background: var(--sy-blue-soft);
  }

  .button.primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--sy-blue) 86%, var(--sy-text));
  }

  .button.danger:hover:not(:disabled) {
    background: var(--sy-red-soft);
  }

  .button.quiet:hover:not(:disabled) {
    background: var(--sy-hover);
    border-color: color-mix(in srgb, var(--sy-text) 24%, var(--sy-border));
  }

  .button:active:not(:disabled),
  .day:active,
  .icon-button:active,
  .text-action:active {
    transform: translateY(1px);
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

  .text-action:hover,
  .icon-button:hover {
    color: var(--sy-blue);
  }

  .icon-button:hover {
    background: var(--sy-hover);
    border-radius: 6px;
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

  .manual-program {
    padding-top: 18px;
  }

  .manual-program-toolbar,
  .manual-add {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) auto;
    align-items: end;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--sy-border);
    border-radius: 10px;
    background: var(--sy-surface);
  }

  .manual-weather {
    display: flex;
    min-height: 38px;
    align-items: center;
    gap: 8px;
  }

  .manual-zone-list {
    margin: 14px 0;
    border: 1px solid var(--sy-border);
    border-radius: 10px;
    overflow: hidden;
  }

  .manual-zone {
    display: grid;
    min-height: 62px;
    padding: 10px 12px;
    grid-template-columns:
      28px minmax(150px, 1fr) minmax(155px, 0.8fr)
      minmax(100px, 0.5fr) 80px auto;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--sy-border);
  }

  .manual-zone:last-child {
    border-bottom: 0;
  }

  .manual-zone-order {
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    color: var(--sy-muted);
    background: var(--sy-blue-soft);
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
  }

  .manual-duration {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .manual-duration input {
    width: 76px;
  }

  .manual-calculated {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .manual-zone-actions {
    display: flex;
    gap: 4px;
  }

  .manual-total {
    display: grid;
    gap: 3px;
  }

  .manual-total span {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .manual-total strong {
    font-size: 18px;
  }

  .manual-start {
    min-height: 40px;
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

  .shell:has(.active-run) .content {
    padding-bottom: 112px;
  }

  .active-run {
    position: fixed;
    z-index: 10;
    right: 0;
    bottom: 0;
    left: 0;
    max-width: 1180px;
    margin: 0 auto;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-bottom: 0;
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -8px 28px var(--sy-shadow);
  }

  .active-run-summary {
    display: grid;
    width: 100%;
    min-height: 58px;
    padding: 9px 14px;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
    color: inherit;
    background: transparent;
    border: 0;
    text-align: left;
  }

  .active-run-summary > span:nth-child(2) {
    display: grid;
    min-width: 0;
    gap: 2px;
  }

  .active-run-summary strong,
  .active-run-summary small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-run-summary small,
  .run-progress-label {
    color: var(--sy-muted);
  }

  .run-pulse {
    width: 10px;
    height: 10px;
    background: var(--sy-green);
    border-radius: 50%;
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--sy-green) 18%, transparent);
  }

  .active-run-progress {
    height: 3px;
    background: color-mix(in srgb, var(--sy-blue) 15%, transparent);
  }

  .active-run-progress span {
    display: block;
    height: 100%;
    background: var(--sy-blue);
    transition: width 1s linear;
  }

  .active-run-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 14px calc(8px + env(safe-area-inset-bottom));
  }

  .active-run-detail {
    padding: 16px 16px 8px;
    border-bottom: 1px solid var(--sy-border);
  }

  .active-run-detail-head,
  .active-run-detail-head > div {
    display: flex;
    align-items: center;
  }

  .active-run-detail-head {
    justify-content: space-between;
    gap: 12px;
  }

  .active-run-detail-head > div {
    align-items: baseline;
    gap: 8px;
  }

  .active-run-detail-head span,
  .run-countdowns span,
  .run-step > span,
  .run-step small {
    color: var(--sy-muted);
    font-size: 11px;
  }

  .run-countdowns {
    display: grid;
    margin-top: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .run-countdowns > div {
    display: grid;
    gap: 3px;
    padding: 10px 12px;
    background: var(--sy-blue-soft);
    border-radius: 8px;
  }

  .run-countdowns strong {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
  }

  .run-sequence {
    display: grid;
    margin-top: 12px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .run-step {
    display: grid;
    min-width: 0;
    gap: 3px;
    padding: 10px;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
  }

  .run-step[active] {
    border-color: var(--sy-blue);
    background: var(--sy-blue-soft);
  }

  .run-step[empty] {
    opacity: 0.55;
  }

  .run-step strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .forecast-source {
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--sy-muted);
    font-size: 12px;
  }

  .forecast-days {
    display: grid;
    gap: 16px;
  }

  .forecast-day {
    overflow: hidden;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
  }

  .forecast-day-head {
    min-height: 46px;
    padding: 9px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--sy-border);
    background: var(--sy-surface-muted);
  }

  .forecast-day-head strong {
    text-transform: capitalize;
  }

  .forecast-day-head span {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .forecast-table-head,
  .forecast-hour {
    display: grid;
    grid-template-columns: 64px minmax(150px, 1fr) 110px 110px 90px 140px;
    align-items: center;
    gap: 12px;
  }

  .forecast-table-head {
    min-height: 34px;
    padding: 0 14px;
    color: var(--sy-muted);
    border-bottom: 1px solid var(--sy-border);
    font-size: 11px;
    font-weight: 600;
  }

  .forecast-hour {
    min-height: 48px;
    padding: 7px 14px;
    border-bottom: 1px solid var(--sy-border);
  }

  .forecast-hour:last-child {
    border-bottom: 0;
  }

  .forecast-hour[raining] {
    box-shadow: inset 3px 0 0 var(--sy-blue);
    background: var(--sy-blue-soft);
  }

  .forecast-hour time {
    color: var(--sy-muted);
    font-variant-numeric: tabular-nums;
  }

  .forecast-condition {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .forecast-condition ha-icon {
    flex: 0 0 auto;
    color: var(--sy-muted);
    --mdc-icon-size: 21px;
  }

  .forecast-condition span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .forecast-metric {
    font-variant-numeric: tabular-nums;
  }

  .forecast-metric > span {
    display: none;
  }

  .forecast-hour[raining] .forecast-metric.precipitation strong,
  .forecast-hour[raining] .forecast-metric.probability strong {
    color: var(--sy-blue);
  }

  .forecast-hour[windy] .forecast-metric.wind strong {
    color: var(--sy-amber);
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
    background: var(--sy-surface-muted);
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

  .schedule-status.wind_skip,
  .schedule-status.wind_unavailable {
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
    background: var(--sy-control);
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
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 7px;
  }

  .day[selected] {
    color: var(--sy-on-accent);
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
    background: var(--sy-control);
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
    background: var(--sy-control);
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
    background: var(--sy-surface-muted);
    font-size: 12px;
    font-weight: 600;
  }

  td.reason-cell {
    min-width: 280px;
    white-space: normal;
  }

  .history-weather {
    margin-top: 5px;
    color: var(--sy-muted);
    font-size: 11px;
    line-height: 1.4;
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
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .ntfy-link-row {
    min-height: 49px;
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid var(--sy-border);
  }

  .ntfy-link-row > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }

  .ntfy-link-row input {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .ntfy-help {
    margin: 9px 0 14px;
  }

  .forecast-settings,
  .rain-station-settings {
    grid-column: 1 / -1;
  }

  .forecast-location,
  .rain-station-city,
  .rain-station-result {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    min-height: 49px;
    border-bottom: 1px solid var(--sy-border);
  }

  .rain-station-city > div {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) auto;
    gap: 8px;
  }

  .forecast-location input,
  .rain-station-city input,
  .rain-station-result select {
    width: 100%;
    min-width: 0;
    height: 36px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .rain-station-status,
  .rain-station-reading {
    min-height: 49px;
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid var(--sy-border);
  }

  .rain-station-reading > span:last-child {
    color: var(--sy-muted);
  }

  .rain-station-error {
    padding: 10px 0;
    color: var(--sy-red);
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
    background: var(--sy-control);
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
    background: var(--sy-control);
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

  .zone-profile-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    padding-top: 16px;
    color: var(--sy-muted);
    font-size: 12px;
  }

  .save-success {
    color: var(--sy-green);
    font-weight: 600;
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
    .manual-program-toolbar,
    .manual-add {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .manual-zone {
      grid-template-columns: 28px minmax(0, 1fr) auto;
    }

    .manual-zone > select,
    .manual-duration,
    .manual-calculated {
      grid-column: 2 / -1;
    }

    .manual-zone-actions {
      grid-column: 3;
      grid-row: 1;
    }

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
      grid-template-columns: repeat(2, 1fr);
    }

    .weather-summary {
      grid-column: 1 / -1;
      border-bottom: 1px solid color-mix(in srgb, var(--sy-amber) 32%, var(--sy-border));
    }

    .metric {
      min-height: 59px;
      padding: 5px 9px;
    }

    .forecast-location,
    .rain-station-city,
    .rain-station-result,
    .rain-station-status,
    .rain-station-reading {
      grid-template-columns: 1fr;
      gap: 7px;
      padding: 10px 0;
    }

    .rain-station-city > div {
      grid-template-columns: 1fr;
    }

    .rain-station-reading > span:last-child {
      justify-self: start;
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

    .forecast-table-head,
    .forecast-hour {
      grid-template-columns: 56px minmax(130px, 1fr) 100px 100px 80px;
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

    .ntfy-link-row {
      grid-template-columns: 1fr;
      align-items: stretch;
      gap: 8px;
      padding: 12px 0;
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

    .zone-profile-actions {
      align-items: stretch;
      flex-direction: column;
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
      box-shadow: 0 2px 8px var(--sy-shadow);
    }
  }

  @media (max-width: 600px) {
    .forecast-source {
      padding: 8px 0;
      align-items: flex-start;
      flex-direction: column;
      gap: 3px;
    }

    .forecast-table-head {
      display: none;
    }

    .forecast-hour {
      min-height: 104px;
      grid-template-columns: 48px minmax(0, 1fr) auto;
      grid-template-rows: auto auto auto;
      gap: 7px 10px;
    }

    .forecast-hour time {
      grid-row: 1 / 4;
      align-self: start;
      padding-top: 3px;
    }

    .forecast-condition {
      grid-column: 2;
    }

    .forecast-metric.temperature {
      grid-column: 3;
      grid-row: 1;
      text-align: right;
    }

    .forecast-metric.precipitation {
      grid-column: 2;
      grid-row: 2;
    }

    .forecast-metric.probability {
      grid-column: 3;
      grid-row: 2;
      text-align: right;
    }

    .forecast-metric.wind {
      grid-column: 2 / 4;
      grid-row: 3;
    }

    .forecast-metric > span {
      display: block;
      margin-bottom: 2px;
      color: var(--sy-muted);
      font-size: 10px;
      font-weight: 400;
    }

    .active-run {
      width: auto;
      right: 8px;
      left: 8px;
    }

    .active-run-actions > button {
      flex: 1;
    }

    .run-sequence {
      grid-template-columns: 1fr;
    }

    .run-step {
      grid-template-columns: 70px minmax(0, 1fr) auto;
      align-items: center;
    }

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
