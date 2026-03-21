import pytest
import httpx

import app.services.stock_service as svc
from app.services.stock_service import StockServiceError, get_quote, search


# ── Helpers ───────────────────────────────────────────────────────────────────

def _quote_response(ticker: str = "AAPL", price: str = "175.50", change: str = "2.30", pct: str = "1.33%") -> dict:
    return {
        "Global Quote": {
            "01. symbol": ticker,
            "05. price": price,
            "09. change": change,
            "10. change percent": pct,
        }
    }


def _search_response(matches: list[dict] | None = None) -> dict:
    if matches is None:
        matches = [
            {"1. symbol": "AAPL", "2. name": "Apple Inc"},
            {"1. symbol": "AAPLX", "2. name": "Apple Fund"},
        ]
    return {"bestMatches": matches}


@pytest.fixture(autouse=True)
def clear_cache():
    svc._cache.clear()
    yield
    svc._cache.clear()


# ── get_quote ─────────────────────────────────────────────────────────────────

class TestGetQuote:
    async def test_success(self, monkeypatch):
        async def mock_get_json(params):
            return _quote_response()

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        quote = await get_quote("aapl")
        assert quote.ticker == "AAPL"
        assert quote.price == 175.50
        assert quote.change == 2.30
        assert quote.change_percent == 1.33

    async def test_normalises_ticker(self, monkeypatch):
        async def mock_get_json(params):
            return _quote_response(ticker="MSFT", price="420.00", change="1.00", pct="0.24%")

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        quote = await get_quote("msft")
        assert quote.ticker == "MSFT"

    async def test_unknown_ticker_raises_404(self, monkeypatch):
        async def mock_get_json(params):
            return {"Global Quote": {}}

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        with pytest.raises(StockServiceError) as exc:
            await get_quote("FAKE")
        assert exc.value.status_code == 404

    async def test_rate_limit_raises_429(self, monkeypatch):
        async def mock_get_json(params):
            raise StockServiceError("rate limit", status_code=429)

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        with pytest.raises(StockServiceError) as exc:
            await get_quote("AAPL")
        assert exc.value.status_code == 429

    async def test_caches_result(self, monkeypatch):
        call_count = 0

        async def mock_get_json(params):
            nonlocal call_count
            call_count += 1
            return _quote_response()

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        await get_quote("AAPL")
        await get_quote("AAPL")
        assert call_count == 1

    async def test_no_api_key_raises_503(self, monkeypatch):
        monkeypatch.setattr(svc.settings, "ALPHA_VANTAGE_API_KEY", "")
        with pytest.raises(StockServiceError) as exc:
            await get_quote("AAPL")
        assert exc.value.status_code == 503


# ── search ────────────────────────────────────────────────────────────────────

class TestSearch:
    async def test_success(self, monkeypatch):
        async def mock_get_json(params):
            return _search_response()

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        results = await search("apple")
        assert len(results) == 2
        assert results[0].ticker == "AAPL"
        assert results[0].name == "Apple Inc"

    async def test_empty_results(self, monkeypatch):
        async def mock_get_json(params):
            return _search_response(matches=[])

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        results = await search("zzz")
        assert results == []

    async def test_caches_result(self, monkeypatch):
        call_count = 0

        async def mock_get_json(params):
            nonlocal call_count
            call_count += 1
            return _search_response()

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        await search("apple")
        await search("apple")
        assert call_count == 1

    async def test_cache_is_case_insensitive(self, monkeypatch):
        call_count = 0

        async def mock_get_json(params):
            nonlocal call_count
            call_count += 1
            return _search_response()

        monkeypatch.setattr(svc, "_get_json", mock_get_json)
        await search("Apple")
        await search("apple")
        assert call_count == 1
