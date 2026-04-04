"""Tests for portfolio alert evaluation — all 5 spec scenarios.

Spec constants:
  original_cost = $120
  threshold     = 15 %
  threshold_profit_price = $138  (= 120 * 1.15)
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import date

import pytest

from jobs.check_portfolio_alerts import (
    AlertStateSnapshot,
    EvalResult,
    HoldingSnapshot,
    evaluate_close,
)

# ── Shared fixture ─────────────────────────────────────────────────────────────

HOLDING = HoldingSnapshot(
    original_cost=120.0,
    threshold_pct=15.0,
    threshold_profit_price=138.0,
)

DAY1 = date(2026, 4, 1)
DAY2 = date(2026, 4, 2)

FRESH_STATE = AlertStateSnapshot()  # zone=pre_threshold, nothing pending


# ── Scenario 1 — Pre-threshold ─────────────────────────────────────────────────
# current_price = $125  →  profit = +4.17 %
# Expected: no alert, zone stays pre_threshold

class TestScenario1PreThreshold:
    def test_no_alert_fires(self):
        result = evaluate_close(HOLDING, FRESH_STATE, close_price=125.0, close_date=DAY1)
        assert result.alert_type is None

    def test_zone_remains_pre_threshold(self):
        result = evaluate_close(HOLDING, FRESH_STATE, close_price=125.0, close_date=DAY1)
        assert result.new_zone == "pre_threshold"

    def test_rung_remains_none(self):
        result = evaluate_close(HOLDING, FRESH_STATE, close_price=125.0, close_date=DAY1)
        assert result.new_rung_pct is None

    def test_no_pending_set(self):
        result = evaluate_close(HOLDING, FRESH_STATE, close_price=125.0, close_date=DAY1)
        assert result.new_pending_rung_pct is None
        assert result.new_pending_close_count == 0


# ── Scenario 2 — Threshold hit (2 consecutive closes) ─────────────────────────
# Day 1 close = $139  →  profit = +15.83 %
# Day 2 close = $140  →  profit = +16.67 %
# Expected: alert fires type='threshold', zone becomes 'profit'

class TestScenario2ThresholdHit:
    def test_day1_no_alert_but_pending_set(self):
        result = evaluate_close(HOLDING, FRESH_STATE, close_price=139.0, close_date=DAY1)
        assert result.alert_type is None
        assert result.new_pending_close_count == 1
        assert result.new_pending_rung_pct == pytest.approx(15.0)

    def test_day2_alert_fires(self):
        after_day1 = evaluate_close(HOLDING, FRESH_STATE, close_price=139.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=140.0, close_date=DAY2)
        assert result.alert_type == "threshold"

    def test_day2_zone_becomes_profit(self):
        after_day1 = evaluate_close(HOLDING, FRESH_STATE, close_price=139.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=140.0, close_date=DAY2)
        assert result.new_zone == "profit"

    def test_day2_rung_set_to_threshold(self):
        after_day1 = evaluate_close(HOLDING, FRESH_STATE, close_price=139.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=140.0, close_date=DAY2)
        assert result.new_rung_pct == pytest.approx(15.0)

    def test_day2_pending_cleared(self):
        after_day1 = evaluate_close(HOLDING, FRESH_STATE, close_price=139.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=140.0, close_date=DAY2)
        assert result.new_pending_rung_pct is None
        assert result.new_pending_close_count == 0


# ── Scenario 3 — Profit ladder up ─────────────────────────────────────────────
# After threshold hit: zone=profit, current_rung=15 %
# Day 1 close = $141  →  profit = +17.5 %   (≥ 15 % + 2 % = 17 %)
# Day 2 close = $142  →  profit = +18.33 %
# Expected: alert fires type='profit_up', current_rung becomes 17 %

class TestScenario3ProfitUp:
    BASE_STATE = AlertStateSnapshot(
        zone="profit",
        current_rung_pct=15.0,
    )

    def test_day1_no_alert_but_pending_set(self):
        result = evaluate_close(HOLDING, self.BASE_STATE, close_price=141.0, close_date=DAY1)
        assert result.alert_type is None
        assert result.new_pending_close_count == 1
        assert result.new_pending_rung_pct == pytest.approx(17.0)

    def test_day2_alert_fires(self):
        after_day1 = evaluate_close(HOLDING, self.BASE_STATE, close_price=141.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=142.0, close_date=DAY2)
        assert result.alert_type == "profit_up"

    def test_day2_rung_advances_to_17(self):
        after_day1 = evaluate_close(HOLDING, self.BASE_STATE, close_price=141.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=142.0, close_date=DAY2)
        assert result.new_rung_pct == pytest.approx(17.0)

    def test_day2_zone_stays_profit(self):
        after_day1 = evaluate_close(HOLDING, self.BASE_STATE, close_price=141.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=142.0, close_date=DAY2)
        assert result.new_zone == "profit"


# ── Scenario 4 — Profit dropping back ─────────────────────────────────────────
# zone=profit, current_rung=17 %
# Day 1 close = $136  →  profit = +13.33 %   (< 17 %)
# Day 2 close = $135  →  profit = +12.5 %
# Expected: alert fires type='profit_down', current_rung becomes 15 %

class TestScenario4ProfitDown:
    BASE_STATE = AlertStateSnapshot(
        zone="profit",
        current_rung_pct=17.0,
    )

    def test_day1_no_alert_but_pending_set(self):
        result = evaluate_close(HOLDING, self.BASE_STATE, close_price=136.0, close_date=DAY1)
        assert result.alert_type is None
        assert result.new_pending_close_count == 1
        assert result.new_pending_rung_pct == pytest.approx(15.0)

    def test_day2_alert_fires(self):
        after_day1 = evaluate_close(HOLDING, self.BASE_STATE, close_price=136.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=135.0, close_date=DAY2)
        assert result.alert_type == "profit_down"

    def test_day2_rung_drops_to_15(self):
        after_day1 = evaluate_close(HOLDING, self.BASE_STATE, close_price=136.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=135.0, close_date=DAY2)
        assert result.new_rung_pct == pytest.approx(15.0)

    def test_day2_zone_stays_profit(self):
        after_day1 = evaluate_close(HOLDING, self.BASE_STATE, close_price=136.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=135.0, close_date=DAY2)
        assert result.new_zone == "profit"


# ── Scenario 5 — Loss ladder ───────────────────────────────────────────────────
# zone=pre_threshold (default new stock)
# Day 1 close = $117  →  profit = -2.5 %   (< -2 % threshold)
# Day 2 close = $116  →  profit = -3.33 %
# Expected: alert fires type='loss', zone='loss'

class TestScenario5Loss:
    def test_day1_no_alert_but_pending_set(self):
        result = evaluate_close(HOLDING, FRESH_STATE, close_price=117.0, close_date=DAY1)
        assert result.alert_type is None
        assert result.new_pending_close_count == 1
        # pending_rung_pct is the loss sentinel (-2.0)
        assert result.new_pending_rung_pct == pytest.approx(-2.0)

    def test_day2_alert_fires(self):
        after_day1 = evaluate_close(HOLDING, FRESH_STATE, close_price=117.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=116.0, close_date=DAY2)
        assert result.alert_type == "loss"

    def test_day2_zone_becomes_loss(self):
        after_day1 = evaluate_close(HOLDING, FRESH_STATE, close_price=117.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=116.0, close_date=DAY2)
        assert result.new_zone == "loss"

    def test_day2_pending_cleared(self):
        after_day1 = evaluate_close(HOLDING, FRESH_STATE, close_price=117.0, close_date=DAY1)
        state_day2 = AlertStateSnapshot(
            zone=after_day1.new_zone,
            current_rung_pct=after_day1.new_rung_pct,
            pending_rung_pct=after_day1.new_pending_rung_pct,
            pending_rung_day1_date=after_day1.new_pending_day1_date,
            pending_close_count=after_day1.new_pending_close_count,
        )
        result = evaluate_close(HOLDING, state_day2, close_price=116.0, close_date=DAY2)
        assert result.new_pending_rung_pct is None
        assert result.new_pending_close_count == 0
