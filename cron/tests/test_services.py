"""Unit tests for cron/services: alpha_vantage and push."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

import services.alpha_vantage as av_mod
from services.alpha_vantage import fetch_quotes
from services.push import send_push


# ── fetch_quotes ──────────────────────────────────────────────────────────────

def _mock_response(data: dict, status_code: int = 200) -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json.return_value = data
    resp.raise_for_status = MagicMock()
    return resp


class TestFetchQuotes:
    async def test_returns_prices(self, monkeypatch):
        monkeypatch.setattr(av_mod.config, "ALPHA_VANTAGE_API_KEY", "testkey")
        monkeypatch.setattr(av_mod.config, "AV_REQUEST_DELAY", 0.0)

        response = _mock_response({
            "Global Quote": {"05. price": "175.50"}
        })

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.alpha_vantage.httpx.AsyncClient", return_value=mock_client):
            prices = await fetch_quotes(["AAPL"])

        assert prices == {"AAPL": 175.50}

    async def test_no_api_key_returns_empty(self, monkeypatch):
        monkeypatch.setattr(av_mod.config, "ALPHA_VANTAGE_API_KEY", "")
        prices = await fetch_quotes(["AAPL"])
        assert prices == {}

    async def test_rate_limit_response_skips_ticker(self, monkeypatch):
        monkeypatch.setattr(av_mod.config, "ALPHA_VANTAGE_API_KEY", "testkey")
        monkeypatch.setattr(av_mod.config, "AV_REQUEST_DELAY", 0.0)

        response = _mock_response({"Information": "API rate limit reached."})

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.alpha_vantage.httpx.AsyncClient", return_value=mock_client):
            prices = await fetch_quotes(["AAPL"])

        assert prices == {}

    async def test_empty_price_field_skips_ticker(self, monkeypatch):
        monkeypatch.setattr(av_mod.config, "ALPHA_VANTAGE_API_KEY", "testkey")
        monkeypatch.setattr(av_mod.config, "AV_REQUEST_DELAY", 0.0)

        response = _mock_response({"Global Quote": {}})

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.alpha_vantage.httpx.AsyncClient", return_value=mock_client):
            prices = await fetch_quotes(["AAPL"])

        assert prices == {}

    async def test_multiple_tickers(self, monkeypatch):
        monkeypatch.setattr(av_mod.config, "ALPHA_VANTAGE_API_KEY", "testkey")
        monkeypatch.setattr(av_mod.config, "AV_REQUEST_DELAY", 0.0)

        call_count = 0

        async def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return _mock_response({"Global Quote": {"05. price": "100.00"}})

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=side_effect)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.alpha_vantage.httpx.AsyncClient", return_value=mock_client):
            prices = await fetch_quotes(["AAPL", "MSFT"])

        assert call_count == 2

    async def test_network_error_skips_ticker(self, monkeypatch):
        monkeypatch.setattr(av_mod.config, "ALPHA_VANTAGE_API_KEY", "testkey")
        monkeypatch.setattr(av_mod.config, "AV_REQUEST_DELAY", 0.0)

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("conn refused"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.alpha_vantage.httpx.AsyncClient", return_value=mock_client):
            prices = await fetch_quotes(["AAPL"])

        assert prices == {}


# ── send_push ─────────────────────────────────────────────────────────────────

class TestSendPush:
    async def test_sends_correct_payload(self):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {"data": [{"status": "ok"}]}

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.push.httpx.AsyncClient", return_value=mock_client):
            await send_push("ExponentPushToken[abc]", "Title", "Body", {"key": "val"})

        call_args = mock_client.post.call_args
        payload = call_args.kwargs["json"]
        assert payload["to"] == "ExponentPushToken[abc]"
        assert payload["title"] == "Title"
        assert payload["body"] == "Body"
        assert payload["data"] == {"key": "val"}

    async def test_expo_error_response_does_not_raise(self):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {
            "data": [{"status": "error", "message": "DeviceNotRegistered"}]
        }

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.push.httpx.AsyncClient", return_value=mock_client):
            # Should not raise — logs a warning instead
            await send_push("ExponentPushToken[bad]", "T", "B")

    async def test_network_error_does_not_raise(self):
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(side_effect=httpx.ConnectError("down"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.push.httpx.AsyncClient", return_value=mock_client):
            await send_push("ExponentPushToken[x]", "T", "B")
