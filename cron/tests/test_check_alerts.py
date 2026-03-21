"""Unit tests for the alert evaluation logic in jobs/check_alerts.py."""

import sys
import os

# Put the cron root on sys.path so bare imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

import pytest

from models import Alert, AlertDirection, AlertStatus, User
from jobs.check_alerts import _is_triggered, _notification_body, check_alerts


# ── _is_triggered ─────────────────────────────────────────────────────────────

def make_alert(direction: AlertDirection, target: float) -> Alert:
    a = Alert()
    a.id = 1
    a.user_id = 1
    a.ticker = "AAPL"
    a.target_price = target
    a.direction = direction
    a.status = AlertStatus.active
    a.triggered_at = None
    return a


class TestIsTriggered:
    def test_above_price_meets_threshold(self):
        assert _is_triggered(make_alert(AlertDirection.above, 150.0), 150.0) is True

    def test_above_price_exceeds_threshold(self):
        assert _is_triggered(make_alert(AlertDirection.above, 150.0), 200.0) is True

    def test_above_price_below_threshold(self):
        assert _is_triggered(make_alert(AlertDirection.above, 150.0), 149.99) is False

    def test_below_price_meets_threshold(self):
        assert _is_triggered(make_alert(AlertDirection.below, 100.0), 100.0) is True

    def test_below_price_under_threshold(self):
        assert _is_triggered(make_alert(AlertDirection.below, 100.0), 50.0) is True

    def test_below_price_above_threshold(self):
        assert _is_triggered(make_alert(AlertDirection.below, 100.0), 100.01) is False


# ── _notification_body ────────────────────────────────────────────────────────

class TestNotificationBody:
    def test_above_format(self):
        alert = make_alert(AlertDirection.above, 150.0)
        title, body = _notification_body(alert, 160.0)
        assert title == "AAPL alert triggered"
        assert "above" in body
        assert "$160.00" in body
        assert "$150.00" in body

    def test_below_format(self):
        alert = make_alert(AlertDirection.below, 100.0)
        _, body = _notification_body(alert, 90.0)
        assert "below" in body


# ── check_alerts pipeline ─────────────────────────────────────────────────────

class TestCheckAlerts:
    async def test_no_active_alerts_exits_early(self):
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(return_value=mock_result)

        mock_ctx = MagicMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with patch("jobs.check_alerts.get_session", return_value=mock_ctx), \
             patch("jobs.check_alerts.fetch_quotes") as mock_fetch:
            await check_alerts()
            mock_fetch.assert_not_called()

    async def test_triggers_alert_and_commits(self):
        alert = make_alert(AlertDirection.above, 100.0)
        alert.id = 7
        alert.user_id = 1

        user = User()
        user.id = 1
        user.expo_push_token = None

        mock_session = AsyncMock()

        alerts_result = MagicMock()
        alerts_result.scalars.return_value.all.return_value = [alert]

        users_result = MagicMock()
        users_result.scalars.return_value = iter([user])

        mock_session.execute = AsyncMock(side_effect=[alerts_result, users_result])
        mock_session.commit = AsyncMock()

        mock_ctx = MagicMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with patch("jobs.check_alerts.get_session", return_value=mock_ctx), \
             patch("jobs.check_alerts.fetch_quotes", AsyncMock(return_value={"AAPL": 150.0})), \
             patch("jobs.check_alerts.send_push") as mock_push:
            await check_alerts()

        assert alert.status == AlertStatus.triggered
        assert alert.triggered_at is not None
        mock_session.commit.assert_awaited_once()
        mock_push.assert_not_called()  # no push token on user

    async def test_sends_push_when_token_present(self):
        alert = make_alert(AlertDirection.above, 100.0)
        alert.id = 8
        alert.user_id = 2

        user = User()
        user.id = 2
        user.expo_push_token = "ExponentPushToken[abc]"

        mock_session = AsyncMock()

        alerts_result = MagicMock()
        alerts_result.scalars.return_value.all.return_value = [alert]

        users_result = MagicMock()
        users_result.scalars.return_value = iter([user])

        mock_session.execute = AsyncMock(side_effect=[alerts_result, users_result])
        mock_session.commit = AsyncMock()

        mock_ctx = MagicMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with patch("jobs.check_alerts.get_session", return_value=mock_ctx), \
             patch("jobs.check_alerts.fetch_quotes", AsyncMock(return_value={"AAPL": 150.0})), \
             patch("jobs.check_alerts.send_push", AsyncMock()) as mock_push:
            await check_alerts()

        mock_push.assert_awaited_once()
        call_kwargs = mock_push.call_args
        assert call_kwargs.args[0] == "ExponentPushToken[abc]"
        assert "data" in call_kwargs.kwargs
        assert call_kwargs.kwargs["data"]["alert_id"] == 8

    async def test_skips_alert_when_price_unavailable(self):
        alert = make_alert(AlertDirection.above, 100.0)
        alert.id = 9
        alert.user_id = 1

        user = User()
        user.id = 1
        user.expo_push_token = None

        mock_session = AsyncMock()

        alerts_result = MagicMock()
        alerts_result.scalars.return_value.all.return_value = [alert]

        users_result = MagicMock()
        users_result.scalars.return_value = iter([user])

        mock_session.execute = AsyncMock(side_effect=[alerts_result, users_result])
        mock_session.commit = AsyncMock()

        mock_ctx = MagicMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        # No prices returned
        with patch("jobs.check_alerts.get_session", return_value=mock_ctx), \
             patch("jobs.check_alerts.fetch_quotes", AsyncMock(return_value={})):
            await check_alerts()

        assert alert.status == AlertStatus.active
        mock_session.commit.assert_not_awaited()
