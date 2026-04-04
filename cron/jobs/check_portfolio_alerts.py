"""Portfolio alert evaluation — pure business logic.

evaluate_close() is the single entry point.  It takes a snapshot of the
holding's static data plus the current alert state, processes one closing
price, and returns an EvalResult describing what (if anything) changed.

No database or network access here — all I/O lives in the caller.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

# ── Constants ──────────────────────────────────────────────────────────────────

LADDER_STEP_PCT: float = 2.0    # each profit rung advances / retreats by this %
LOSS_TRIGGER_PCT: float = -2.0  # profit below this % triggers loss zone
CONSECUTIVE_CLOSES: int = 2     # consecutive closes required before alert fires

# Sentinel stored in pending_rung_pct when a loss alert is pending
_LOSS_SENTINEL: float = LOSS_TRIGGER_PCT


# ── Input / output types ───────────────────────────────────────────────────────

@dataclass(frozen=True)
class HoldingSnapshot:
    """Static fields from the holdings row that the evaluator needs."""
    original_cost: float       # purchase price, never changes
    threshold_pct: float       # e.g. 15.0  (the first profit rung)
    threshold_profit_price: float  # = original_cost * (1 + threshold_pct / 100)


@dataclass(frozen=True)
class AlertStateSnapshot:
    """Fields from portfolio_alert_state at the time of evaluation."""
    zone: str = "pre_threshold"               # pre_threshold | profit | loss
    current_rung_pct: Optional[float] = None  # None while in pre_threshold
    pending_rung_pct: Optional[float] = None  # candidate rung (or _LOSS_SENTINEL)
    pending_rung_day1_date: Optional[date] = None
    pending_close_count: int = 0


@dataclass(frozen=True)
class EvalResult:
    """Everything the caller needs to update the DB and send a notification."""
    alert_type: Optional[str]              # threshold | profit_up | profit_down | loss | None
    new_zone: str
    new_rung_pct: Optional[float]
    new_pending_rung_pct: Optional[float]
    new_pending_close_count: int
    new_pending_day1_date: Optional[date]


# ── Internal helpers ───────────────────────────────────────────────────────────

def _profit_pct(price: float, original_cost: float) -> float:
    return (price - original_cost) / original_cost * 100.0


def _get_candidate(
    zone: str,
    current_rung: Optional[float],
    profit_pct: float,
    threshold_pct: float,
) -> tuple[Optional[str], Optional[float]]:
    """
    Given the current state and profit %, return (alert_type, pending_rung_value).

    pending_rung_value is the value that should be stored in pending_rung_pct
    so that a subsequent matching close can confirm the alert.
    Returns (None, None) when the current price implies no pending action.
    """
    # Loss check applies in any zone except 'loss' itself
    if zone != "loss" and profit_pct < LOSS_TRIGGER_PCT:
        return "loss", _LOSS_SENTINEL

    if zone == "pre_threshold":
        if profit_pct >= threshold_pct:
            return "threshold", threshold_pct
        return None, None

    if zone == "profit":
        assert current_rung is not None, "current_rung must be set in profit zone"
        next_rung = current_rung + LADDER_STEP_PCT
        if profit_pct >= next_rung:
            return "profit_up", next_rung
        if profit_pct < current_rung:
            return "profit_down", current_rung - LADDER_STEP_PCT

    # zone == "loss" (or profit with no action needed)
    return None, None


def _same_candidate(
    pending_rung: Optional[float],
    candidate_rung: Optional[float],
) -> bool:
    if pending_rung is None or candidate_rung is None:
        return False
    return abs(pending_rung - candidate_rung) < 0.001


# ── Public API ─────────────────────────────────────────────────────────────────

def evaluate_close(
    holding: HoldingSnapshot,
    state: AlertStateSnapshot,
    close_price: float,
    close_date: date,
) -> EvalResult:
    """
    Process one closing price against the current alert state.

    Returns an EvalResult.  When alert_type is not None the caller should:
      1. Write the new state fields back to portfolio_alert_state
      2. Insert a row into portfolio_alert_history
      3. Send a push notification to the user
    """
    profit_pct = _profit_pct(close_price, holding.original_cost)
    alert_type, candidate_rung = _get_candidate(
        state.zone, state.current_rung_pct, profit_pct, holding.threshold_pct
    )

    # No actionable candidate — reset pending
    if alert_type is None:
        return EvalResult(
            alert_type=None,
            new_zone=state.zone,
            new_rung_pct=state.current_rung_pct,
            new_pending_rung_pct=None,
            new_pending_close_count=0,
            new_pending_day1_date=None,
        )

    # Does this close continue the same pending candidate?
    if (
        state.pending_close_count >= 1
        and _same_candidate(state.pending_rung_pct, candidate_rung)
    ):
        new_count = state.pending_close_count + 1

        if new_count >= CONSECUTIVE_CLOSES:
            # ── FIRE ──────────────────────────────────────────────────────────
            if alert_type == "loss":
                return EvalResult(
                    alert_type="loss",
                    new_zone="loss",
                    new_rung_pct=state.current_rung_pct,
                    new_pending_rung_pct=None,
                    new_pending_close_count=0,
                    new_pending_day1_date=None,
                )
            if alert_type == "threshold":
                return EvalResult(
                    alert_type="threshold",
                    new_zone="profit",
                    new_rung_pct=candidate_rung,
                    new_pending_rung_pct=None,
                    new_pending_close_count=0,
                    new_pending_day1_date=None,
                )
            if alert_type in ("profit_up", "profit_down"):
                return EvalResult(
                    alert_type=alert_type,
                    new_zone="profit",
                    new_rung_pct=candidate_rung,
                    new_pending_rung_pct=None,
                    new_pending_close_count=0,
                    new_pending_day1_date=None,
                )

        # Still accumulating — update count but don't fire
        return EvalResult(
            alert_type=None,
            new_zone=state.zone,
            new_rung_pct=state.current_rung_pct,
            new_pending_rung_pct=candidate_rung,
            new_pending_close_count=new_count,
            new_pending_day1_date=state.pending_rung_day1_date,
        )

    # New candidate — start counting from 1
    return EvalResult(
        alert_type=None,
        new_zone=state.zone,
        new_rung_pct=state.current_rung_pct,
        new_pending_rung_pct=candidate_rung,
        new_pending_close_count=1,
        new_pending_day1_date=close_date,
    )
