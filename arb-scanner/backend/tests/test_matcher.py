"""Tests for the Groq LLM matcher."""
import hashlib
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.services.matcher as matcher_module
from app.models.market import NormalizedMarket
from app.services.matcher import _cache_key, _market_to_dict, match_markets


def make_market(**kwargs):
    """Build a minimal NormalizedMarket for testing."""
    defaults = {
        "id": "poly:test-123",
        "platform": "polymarket",
        "question": "Will BTC hit $100k?",
        "category": "Crypto",
        "yes_price": 0.60,
        "no_price": 0.40,
        "volume": 5000.0,
        "url": "https://polymarket.com/event/btc",
        "end_date": datetime(2026, 3, 31, tzinfo=timezone.utc),
        "last_updated": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "embed_text": "",
    }
    defaults.update(kwargs)
    return NormalizedMarket(**defaults)


def make_db_mock(cached_rows=None):
    """Build a mock DB object that returns cached_rows for match queries."""
    cursor = AsyncMock()
    cursor.fetchall = AsyncMock(return_value=cached_rows or [])
    db = AsyncMock()
    db.execute = AsyncMock(return_value=cursor)
    return db


class TestCacheKey:
    def test_produces_md5_hex(self):
        key = _cache_key("poly:abc", "kalshi:xyz")
        expected = hashlib.md5("poly:abc|kalshi:xyz".encode()).hexdigest()
        assert key == expected

    def test_different_ids_produce_different_keys(self):
        assert _cache_key("poly:a", "kalshi:b") != _cache_key("poly:c", "kalshi:d")

    def test_order_matters(self):
        # (poly, kalshi) != (kalshi, poly)
        assert _cache_key("poly:a", "kalshi:b") != _cache_key("kalshi:b", "poly:a")

    def test_deterministic(self):
        k1 = _cache_key("poly:x", "kalshi:y")
        k2 = _cache_key("poly:x", "kalshi:y")
        assert k1 == k2

    def test_key_is_32_char_hex(self):
        key = _cache_key("poly:abc", "kalshi:xyz")
        assert len(key) == 32
        assert all(c in "0123456789abcdef" for c in key)


class TestMarketToDict:
    def test_dict_passes_through_unchanged(self):
        m = {"id": "poly:abc", "question": "Will X?", "yes_price": 0.5}
        result = _market_to_dict(m)
        assert result is m

    def test_normalized_market_converted(self):
        m = make_market()
        result = _market_to_dict(m)
        assert result["id"] == m.id
        assert result["question"] == m.question
        assert result["yes_price"] == m.yes_price
        assert result["no_price"] == m.no_price
        assert result["volume"] == m.volume

    def test_includes_end_date(self):
        m = make_market(end_date=datetime(2026, 6, 30, tzinfo=timezone.utc))
        result = _market_to_dict(m)
        assert "end_date" in result

    def test_includes_category(self):
        m = make_market(category="Sports")
        result = _market_to_dict(m)
        assert result["category"] == "Sports"

    def test_includes_url(self):
        m = make_market(url="https://example.com")
        result = _market_to_dict(m)
        assert result["url"] == "https://example.com"


class TestMatchMarkets:
    async def test_returns_empty_without_groq_key(self):
        with patch.object(matcher_module.settings, "GROQ_API_KEY", ""):
            result = await match_markets([], [])
        assert result == []

    async def test_returns_empty_for_empty_market_lists(self):
        with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"):
            with patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()):
                with patch("app.services.matcher.find_embedding_candidates", new_callable=AsyncMock, return_value=[]):
                    result = await match_markets([], [])
        assert result == []

    async def test_skips_candidates_in_rejection_cache(self):
        poly = make_market(id="poly:REJ", platform="polymarket")
        kalshi = make_market(id="kalshi:REJ", platform="kalshi")
        key = _cache_key("poly:REJ", "kalshi:REJ")

        original_rejected = matcher_module._rejected_keys.copy()
        try:
            matcher_module._rejected_keys.add(key)

            fake_candidates = [{"poly_id": "poly:REJ", "kalshi_id": "kalshi:REJ", "confidence": 0.9}]

            with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
                 patch("app.services.matcher.find_embedding_candidates",
                       new_callable=AsyncMock, return_value=fake_candidates), \
                 patch("app.services.matcher.get_db", new_callable=AsyncMock,
                       return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock) as mock_groq:

                await match_markets([poly], [kalshi])
                mock_groq.assert_not_called()
        finally:
            matcher_module._rejected_keys = original_rejected

    async def test_skips_cached_db_matches(self):
        poly = make_market(id="poly:CACHED", platform="polymarket")
        kalshi = make_market(id="kalshi:CACHED", platform="kalshi")

        # Return a "cached" match row from the DB
        cached_row = MagicMock()
        cached_row.__getitem__ = lambda self, k: {
            "polymarket_id": "poly:CACHED",
            "kalshi_id": "kalshi:CACHED",
        }[k]
        db_mock = make_db_mock(cached_rows=[cached_row])

        fake_candidates = [{"poly_id": "poly:CACHED", "kalshi_id": "kalshi:CACHED", "confidence": 0.9}]

        with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
             patch("app.services.matcher.find_embedding_candidates",
                   new_callable=AsyncMock, return_value=fake_candidates), \
             patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=db_mock), \
             patch("app.services.matcher._call_groq", new_callable=AsyncMock) as mock_groq:

            await match_markets([poly], [kalshi])
            mock_groq.assert_not_called()

    async def test_confirmed_match_returned(self):
        poly = make_market(id="poly:CONF", platform="polymarket", question="Will X happen?")
        kalshi = make_market(id="kalshi:CONF", platform="kalshi", question="Will X happen?")

        fake_candidates = [{"poly_id": "poly:CONF", "kalshi_id": "kalshi:CONF", "confidence": 0.88}]
        groq_response = '{"confirmed": true, "reasoning": "Same question and deadline"}'

        with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
             patch("app.services.matcher.find_embedding_candidates",
                   new_callable=AsyncMock, return_value=fake_candidates), \
             patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()), \
             patch("app.services.matcher._call_groq", new_callable=AsyncMock, return_value=groq_response):

            result = await match_markets([poly], [kalshi])

        assert len(result) == 1
        assert result[0]["polymarket_id"] == "poly:CONF"
        assert result[0]["kalshi_id"] == "kalshi:CONF"
        assert result[0]["confidence"] == 0.88

    async def test_rejected_match_added_to_rejection_cache(self):
        poly = make_market(id="poly:RJ2", platform="polymarket")
        kalshi = make_market(id="kalshi:RJ2", platform="kalshi")
        key = _cache_key("poly:RJ2", "kalshi:RJ2")

        original_rejected = matcher_module._rejected_keys.copy()
        try:
            matcher_module._rejected_keys.discard(key)

            fake_candidates = [{"poly_id": "poly:RJ2", "kalshi_id": "kalshi:RJ2", "confidence": 0.85}]
            groq_response = '{"confirmed": false, "reasoning": "Different events"}'

            with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
                 patch("app.services.matcher.find_embedding_candidates",
                       new_callable=AsyncMock, return_value=fake_candidates), \
                 patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock, return_value=groq_response):

                await match_markets([poly], [kalshi])

            assert key in matcher_module._rejected_keys
        finally:
            matcher_module._rejected_keys = original_rejected

    async def test_below_confidence_threshold_rejected(self):
        """Candidates below _CONFIDENCE_THRESHOLD are not confirmed."""
        poly = make_market(id="poly:LOW", platform="polymarket")
        kalshi = make_market(id="kalshi:LOW", platform="kalshi")

        # Confidence below the 0.7 threshold
        fake_candidates = [{"poly_id": "poly:LOW", "kalshi_id": "kalshi:LOW", "confidence": 0.5}]
        groq_response = '{"confirmed": true, "reasoning": "Same question"}'

        with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
             patch("app.services.matcher.find_embedding_candidates",
                   new_callable=AsyncMock, return_value=fake_candidates), \
             patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()), \
             patch("app.services.matcher._call_groq", new_callable=AsyncMock, return_value=groq_response):

            result = await match_markets([poly], [kalshi])

        # Should not be confirmed because _pass2_confirm rejects confidence < threshold
        assert result == []

    async def test_no_embedding_candidates_returns_empty(self):
        poly = make_market(id="poly:A", platform="polymarket")
        kalshi = make_market(id="kalshi:B", platform="kalshi")

        with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
             patch("app.services.matcher.find_embedding_candidates",
                   new_callable=AsyncMock, return_value=[]), \
             patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()):

            result = await match_markets([poly], [kalshi])

        assert result == []
