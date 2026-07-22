"""Persistent multi-day water balance helpers for adaptive programs."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, replace
from datetime import UTC, date, datetime, timedelta
from typing import Any

from .models import ForecastHour

MAX_CONSERVATIVE_BACKFILL_DAYS = 7


@dataclass(frozen=True, slots=True)
class AdaptiveBalance:
    """One program's durable soil-water ledger in millimetres."""

    balance_mm: float = 0.0
    last_accounted_date: date | None = None
    deferred_windows: int = 0
    last_irrigation_at: datetime | None = None
    last_applied_mm: float = 0.0
    last_daily_etc_mm: float = 0.0
    last_daily_measured_rain_mm: float = 0.0
    last_gap_days: int = 0
    backfilled_gap_days: int = 0
    unaccounted_gap_days: int = 0
    rebaselined_after_gap: bool = False
    last_rebaseline_date: date | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> AdaptiveBalance:
        """Load a tolerant runtime record written by this or an older release."""
        raw = data or {}
        accounted = _parse_date(raw.get("last_accounted_date"))
        irrigated_at = _parse_datetime(raw.get("last_irrigation_at"))
        return cls(
            balance_mm=round(_finite_float(raw.get("balance_mm"), 0.0), 3),
            last_accounted_date=accounted,
            deferred_windows=max(0, int(_finite_float(raw.get("deferred_windows"), 0))),
            last_irrigation_at=irrigated_at,
            last_applied_mm=max(
                0.0,
                round(_finite_float(raw.get("last_applied_mm"), 0.0), 3),
            ),
            last_daily_etc_mm=max(
                0.0,
                round(_finite_float(raw.get("last_daily_etc_mm"), 0.0), 3),
            ),
            last_daily_measured_rain_mm=max(
                0.0,
                round(
                    _finite_float(raw.get("last_daily_measured_rain_mm"), 0.0),
                    3,
                ),
            ),
            last_gap_days=max(0, int(_finite_float(raw.get("last_gap_days"), 0))),
            backfilled_gap_days=max(
                0,
                int(_finite_float(raw.get("backfilled_gap_days"), 0)),
            ),
            unaccounted_gap_days=max(
                0,
                int(_finite_float(raw.get("unaccounted_gap_days"), 0)),
            ),
            rebaselined_after_gap=bool(raw.get("rebaselined_after_gap", False)),
            last_rebaseline_date=_parse_date(raw.get("last_rebaseline_date")),
        )

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-safe runtime representation."""
        return {
            "balance_mm": round(self.balance_mm, 3),
            "last_accounted_date": (
                self.last_accounted_date.isoformat()
                if self.last_accounted_date is not None
                else None
            ),
            "deferred_windows": self.deferred_windows,
            "last_irrigation_at": (
                self.last_irrigation_at.isoformat()
                if self.last_irrigation_at is not None
                else None
            ),
            "last_applied_mm": round(self.last_applied_mm, 3),
            "last_daily_etc_mm": round(self.last_daily_etc_mm, 3),
            "last_daily_measured_rain_mm": round(
                self.last_daily_measured_rain_mm,
                3,
            ),
            "last_gap_days": self.last_gap_days,
            "backfilled_gap_days": self.backfilled_gap_days,
            "unaccounted_gap_days": self.unaccounted_gap_days,
            "rebaselined_after_gap": self.rebaselined_after_gap,
            "last_rebaseline_date": (
                self.last_rebaseline_date.isoformat()
                if self.last_rebaseline_date is not None
                else None
            ),
        }


def account_daily_balance(
    state: AdaptiveBalance,
    accounting_date: date,
    etc_mm: float,
    effective_rain_mm: float,
    max_rain_credit_mm: float,
) -> tuple[AdaptiveBalance, float]:
    """Apply the latest ETc/rain estimate for a calendar day idempotently.

    The current day may be refreshed as measured rain arrives.  ET is booked
    once, while only newly observed rain is applied on later refreshes.  Older
    days remain immutable.
    """
    if state.last_accounted_date is not None and accounting_date < state.last_accounted_date:
        return state, 0.0
    etc = max(0.0, _finite_float(etc_mm, 0.0))
    rain = max(0.0, _finite_float(effective_rain_mm, 0.0))
    credit_limit = max(0.0, _finite_float(max_rain_credit_mm, 0.0))

    if state.last_accounted_date == accounting_date:
        # Rain accounting is cumulative within the day.  Never reverse already
        # observed rainfall if a rolling station value later becomes smaller.
        booked_rain = max(state.last_daily_measured_rain_mm, rain)
        delta = -(booked_rain - state.last_daily_measured_rain_mm)
        updated_balance = max(-credit_limit, state.balance_mm + delta)
        applied_delta = updated_balance - state.balance_mm
        return (
            replace(
                state,
                balance_mm=round(updated_balance, 3),
                last_daily_measured_rain_mm=round(booked_rain, 3),
            ),
            round(applied_delta, 3),
        )

    delta = etc - rain
    gap_days = (
        max(0, (accounting_date - state.last_accounted_date).days - 1)
        if state.last_accounted_date is not None
        else 0
    )
    backfilled_days = min(gap_days, MAX_CONSERVATIVE_BACKFILL_DAYS)
    unaccounted_days = max(0, gap_days - backfilled_days)
    prior_daily_need = max(
        0.0,
        (
            state.last_daily_etc_mm - state.last_daily_measured_rain_mm
            if state.last_daily_etc_mm > 0
            else etc - rain
        ),
    )
    if unaccounted_days > 0:
        # Once the outage exceeds the bounded reconstruction horizon, carrying
        # either the old debt or a guessed multi-day debt is less safe than a
        # transparent rebaseline.  Start from today's measured balance only.
        backfilled_days = 0
        updated_balance = max(-credit_limit, delta)
    else:
        backfilled_need = prior_daily_need * backfilled_days
        updated_balance = max(
            -credit_limit,
            state.balance_mm + backfilled_need + delta,
        )
    applied_delta = updated_balance - state.balance_mm
    return (
        replace(
            state,
            balance_mm=round(updated_balance, 3),
            last_accounted_date=accounting_date,
            last_daily_etc_mm=round(etc, 3),
            last_daily_measured_rain_mm=round(rain, 3),
            last_gap_days=(gap_days if gap_days > 0 else state.last_gap_days),
            backfilled_gap_days=(
                backfilled_days if gap_days > 0 else state.backfilled_gap_days
            ),
            unaccounted_gap_days=(
                gap_days if unaccounted_days > 0 else state.unaccounted_gap_days
            ),
            rebaselined_after_gap=(
                True if unaccounted_days > 0 else state.rebaselined_after_gap
            ),
            last_rebaseline_date=(
                accounting_date
                if unaccounted_days > 0
                else state.last_rebaseline_date
            ),
        ),
        round(applied_delta, 3),
    )


def choose_irrigation_target(balance_mm: float, max_event_mm: float) -> float:
    """Return the positive depth that may be applied in one watering event."""
    return round(
        min(
            max(0.0, _finite_float(balance_mm, 0.0)),
            max(0.0, _finite_float(max_event_mm, 0.0)),
        ),
        3,
    )


def should_defer_watering(
    balance_mm: float,
    forecast_rain_mm: float,
    deferred_windows: int,
    min_balance_mm: float,
    max_defer_windows: int,
) -> tuple[bool, str]:
    """Decide whether an allowed window should remain unused."""
    balance = max(0.0, _finite_float(balance_mm, 0.0))
    rain = max(0.0, _finite_float(forecast_rain_mm, 0.0))
    deferrals = max(0, int(deferred_windows))
    maximum = max(0, int(max_defer_windows))
    force_due = deferrals >= maximum
    if balance <= 0:
        return True, "A vízmérlegben nincs pótlandó vízhiány."
    minimum = max(0.0, _finite_float(min_balance_mm, 0.0))
    net_after_rain = max(0.0, balance - rain)
    if rain > 0 and net_after_rain <= 0:
        return (
            True,
            f"A következő időszak {rain:g} mm esője várhatóan teljesen "
            f"fedezi a {balance:g} mm vízhiányt.",
        )
    if not force_due and rain > 0 and net_after_rain < minimum:
        return (
            True,
            f"A következő időszak {rain:g} mm esője után csak "
            f"{net_after_rain:g} mm pótlás maradna.",
        )
    if not force_due and balance < minimum:
        return (
            True,
            f"A {balance:g} mm vízhiány még nem éri el a {minimum:g} mm indítási küszöböt.",
        )
    if force_due and net_after_rain < minimum:
        return (
            False,
            "A maximális számú engedélyezett időablak eltelt, ezért a kisebb "
            "vízhiány is pótlódik.",
        )
    return False, "A felhalmozott vízhiány elérte az öntözési küszöböt."


def target_depth_candidates(target_mm: float, step_mm: float = 0.5) -> list[float]:
    """Return the exact target followed by lower grid-aligned depths."""
    target = round(max(0.0, _finite_float(target_mm, 0.0)), 3)
    step = max(0.1, _finite_float(step_mm, 0.5))
    if target < step:
        return []

    values = [target]
    highest_grid_multiple = int((target + 1e-9) // step)
    for multiple in range(highest_grid_multiple, 0, -1):
        candidate = round(multiple * step, 3)
        if candidate < target - 1e-9 and candidate not in values:
            values.append(candidate)
    return values


def settle_completed_irrigation(
    state: AdaptiveBalance,
    applied_mm: float,
    completed_at: datetime,
) -> AdaptiveBalance:
    """Debit confirmed physical delivery and soil-satisfied water need."""
    applied = max(0.0, _finite_float(applied_mm, 0.0))
    if completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=UTC)
    return replace(
        state,
        balance_mm=round(state.balance_mm - applied, 3),
        deferred_windows=0,
        last_irrigation_at=completed_at,
        last_applied_mm=round(applied, 3),
    )


def settle_soil_satisfied_need(
    state: AdaptiveBalance,
    satisfied_mm: float,
) -> AdaptiveBalance:
    """Debit water need already satisfied by measured soil moisture."""
    satisfied = max(0.0, _finite_float(satisfied_mm, 0.0))
    return replace(
        state,
        balance_mm=round(state.balance_mm - satisfied, 3),
        deferred_windows=0,
    )


def defer_window(state: AdaptiveBalance) -> AdaptiveBalance:
    """Record one unused allowed window without changing its water debt."""
    return replace(state, deferred_windows=state.deferred_windows + 1)


def forecast_rain_in_horizon(
    forecast: Iterable[ForecastHour],
    starts_at: datetime,
    hours: int,
) -> float:
    """Sum forecast rainfall from a decision instant through a bounded horizon."""
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=UTC)
    horizon = starts_at + timedelta(hours=max(1, int(hours)))
    total = 0.0
    for sample in forecast:
        timestamp = sample.timestamp
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)
        if starts_at <= timestamp < horizon:
            total += max(0.0, float(sample.precipitation_mm))
    return round(total, 3)


def _finite_float(value: Any, default: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed == parsed and parsed not in {float("inf"), float("-inf")} else default


def _parse_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None


def _parse_datetime(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    try:
        parsed = datetime.fromisoformat(str(value))
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)
