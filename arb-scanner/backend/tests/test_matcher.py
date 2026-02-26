"""Tests for the Groq LLM matcher."""
import hashlib
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.services.matcher as matcher_module
from app.models.market import NormalizedMarket
from app.services.matcher import (
    _DATE_TOLERANCE_SECONDS,
    _cache_key,
    _dates_compatible,
    _market_to_dict,
    _parse_date,
    match_markets,
)


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


def make_market_dict(market_id, question, end_date="2026-03-31", yes_price=0.6):
    return {
        "id": market_id,
        "question": question,
        "category": "Crypto",
        "yes_price": yes_price,
        "no_price": 1 - yes_price,
        "volume": 1000.0,
        "url": "",
        "end_date": end_date,
    }


# ---------------------------------------------------------------------------
# _parse_date
# ---------------------------------------------------------------------------

class TestParseDate:
    def test_datetime_passthrough(self):
        dt = datetime(2026, 3, 31, tzinfo=timezone.utc)
        assert _parse_date(dt) is dt

    def test_iso_string(self):
        result = _parse_date("2026-03-31T00:00:00+00:00")
        assert result == datetime(2026, 3, 31, tzinfo=timezone.utc)

    def test_z_suffix_converted(self):
        result = _parse_date("2026-03-31T12:00:00Z")
        assert result == datetime(2026, 3, 31, 12, 0, 0, tzinfo=timezone.utc)

    def test_none_returns_none(self):
        assert _parse_date(None) is None

    def test_empty_string_returns_none(self):
        assert _parse_date("") is None

    def test_unknown_string_returns_none(self):
        assert _parse_date("unknown") is None

    def test_malformed_string_returns_none(self):
        assert _parse_date("not-a-date") is None

    def test_date_only_string(self):
        # date-only ISO strings should parse fine
        result = _parse_date("2026-03-31")
        assert result is not None
        assert result.year == 2026
        assert result.month == 3
        assert result.day == 31


# ---------------------------------------------------------------------------
# _dates_compatible
# ---------------------------------------------------------------------------

class TestDatesCompatible:
    def test_same_date_compatible(self):
        date = "2026-03-31T00:00:00Z"
        assert _dates_compatible(date, date) is True

    def test_within_tolerance_compatible(self):
        # 12 hours apart — within 24h tolerance
        d1 = datetime(2026, 3, 31, 0, tzinfo=timezone.utc)
        d2 = datetime(2026, 3, 31, 12, tzinfo=timezone.utc)
        assert _dates_compatible(d1, d2) is True

    def test_exactly_at_tolerance_compatible(self):
        d1 = datetime(2026, 3, 31, 0, tzinfo=timezone.utc)
        d2 = d1 + timedelta(seconds=_DATE_TOLERANCE_SECONDS)
        assert _dates_compatible(d1, d2) is True

    def test_beyond_tolerance_incompatible(self):
        # 31 days apart (February vs March)
        d1 = "2026-02-28T00:00:00Z"
        d2 = "2026-03-31T00:00:00Z"
        assert _dates_compatible(d1, d2) is False

    def test_just_over_tolerance_incompatible(self):
        d1 = datetime(2026, 3, 31, 0, tzinfo=timezone.utc)
        d2 = d1 + timedelta(seconds=_DATE_TOLERANCE_SECONDS + 1)
        assert _dates_compatible(d1, d2) is False

    def test_poly_missing_returns_true(self):
        # Missing date → let LLM decide
        assert _dates_compatible(None, "2026-03-31T00:00:00Z") is True

    def test_kalshi_missing_returns_true(self):
        assert _dates_compatible("2026-03-31T00:00:00Z", None) is True

    def test_both_missing_returns_true(self):
        assert _dates_compatible(None, None) is True

    def test_unknown_string_returns_true(self):
        assert _dates_compatible("unknown", "2026-03-31T00:00:00Z") is True

    def test_malformed_date_returns_true(self):
        # Unparseable → treat as missing, let LLM decide
        assert _dates_compatible("not-a-date", "2026-03-31T00:00:00Z") is True

    def test_tolerance_is_24_hours(self):
        assert _DATE_TOLERANCE_SECONDS == 86400


# ---------------------------------------------------------------------------
# _cache_key
# ---------------------------------------------------------------------------

class TestCacheKey:
    def test_produces_md5_hex(self):
        key = _cache_key("poly:abc", "kalshi:xyz")
        expected = hashlib.md5("poly:abc|kalshi:xyz".encode()).hexdigest()
        assert key == expected

    def test_different_ids_produce_different_keys(self):
        assert _cache_key("poly:a", "kalshi:b") != _cache_key("poly:c", "kalshi:d")

    def test_order_matters(self):
        assert _cache_key("poly:a", "kalshi:b") != _cache_key("kalshi:b", "poly:a")

    def test_deterministic(self):
        assert _cache_key("poly:x", "kalshi:y") == _cache_key("poly:x", "kalshi:y")

    def test_key_is_32_char_hex(self):
        key = _cache_key("poly:abc", "kalshi:xyz")
        assert len(key) == 32
        assert all(c in "0123456789abcdef" for c in key)


# ---------------------------------------------------------------------------
# _market_to_dict
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# _pass2_confirm
# ---------------------------------------------------------------------------

class TestPass2Confirm:
    async def test_rejects_below_confidence_threshold(self):
        """Candidates below _CONFIDENCE_THRESHOLD (0.7) are immediately rejected."""
        candidate = {"poly_id": "poly:A", "kalshi_id": "kalshi:B", "confidence": 0.5}
        markets = {
            "poly:A": make_market_dict("poly:A", "Will X?"),
            "kalshi:B": make_market_dict("kalshi:B", "Will X?"),
        }
        with patch("app.services.matcher._call_groq", new_callable=AsyncMock) as mock_groq:
            result = await matcher_module._pass2_confirm(candidate, markets)
        assert result is None
        mock_groq.assert_not_called()

    async def test_accepts_matching_questions_and_deadlines(self):
        candidate = {"poly_id": "poly:A", "kalshi_id": "kalshi:B", "confidence": 0.85}
        markets = {
            "poly:A": make_market_dict("poly:A", "Will BTC hit $100k?", end_date="2026-03-31"),
            "kalshi:B": make_market_dict("kalshi:B", "Will BTC hit $100k?", end_date="2026-03-31"),
        }
        groq_response = '{"confirmed": true, "reasoning": "Same question and deadline"}'
        with patch("app.services.matcher._call_groq", new_callable=AsyncMock, return_value=groq_response):
            result = await matcher_module._pass2_confirm(candidate, markets)
        assert result is not None
        assert result["polymarket_id"] == "poly:A"
        assert result["kalshi_id"] == "kalshi:B"
        assert result["confidence"] == 0.85

    async def test_rejects_different_deadlines(self):
        """The Warsh bug — different resolution deadlines must be rejected."""
        candidate = {"poly_id": "poly:A", "kalshi_id": "kalshi:B", "confidence": 0.90}
        markets = {
            "poly:A": make_market_dict("poly:A", "Will X happen?", end_date="2026-02-28"),
            "kalshi:B": make_market_dict("kalshi:B", "Will X happen?", end_date="2026-03-31"),
        }
        groq_response = '{"confirmed": false, "reasoning": "Different resolution deadlines"}'
        with patch("app.services.matcher._call_groq", new_callable=AsyncMock, return_value=groq_response):
            result = await matcher_module._pass2_confirm(candidate, markets)
        assert result is None

    async def test_handles_malformed_groq_response(self):
        candidate = {"poly_id": "poly:A", "kalshi_id": "kalshi:B", "confidence": 0.85}
        markets = {
            "poly:A": make_market_dict("poly:A", "Will X?"),
            "kalshi:B": make_market_dict("kalshi:B", "Will X?"),
        }
        with patch("app.services.matcher._call_groq", new_callable=AsyncMock, return_value="not valid json"):
            result = await matcher_module._pass2_confirm(candidate, markets)
        assert result is None

    async def test_handles_none_groq_response(self):
        candidate = {"poly_id": "poly:A", "kalshi_id": "kalshi:B", "confidence": 0.85}
        markets = {
            "poly:A": make_market_dict("poly:A", "Will X?"),
            "kalshi:B": make_market_dict("kalshi:B", "Will X?"),
        }
        with patch("app.services.matcher._call_groq", new_callable=AsyncMock, return_value=None):
            result = await matcher_module._pass2_confirm(candidate, markets)
        assert result is None

    async def test_returns_none_when_market_not_in_lookup(self):
        candidate = {"poly_id": "poly:MISSING", "kalshi_id": "kalshi:MISSING", "confidence": 0.85}
        with patch("app.services.matcher._call_groq", new_callable=AsyncMock) as mock_groq:
            result = await matcher_module._pass2_confirm(candidate, {})
        assert result is None
        mock_groq.assert_not_called()


# ---------------------------------------------------------------------------
# match_markets
# ---------------------------------------------------------------------------

class TestMatchMarkets:
    async def test_returns_empty_without_groq_key(self):
        with patch.object(matcher_module.settings, "GROQ_API_KEY", ""):
            result = await match_markets([], [])
        assert result == []

    async def test_returns_empty_for_empty_market_lists(self):
        with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
             patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()), \
             patch("app.services.matcher.find_embedding_candidates",
                   new_callable=AsyncMock, return_value=[]):
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
                 patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock) as mock_groq:

                await match_markets([poly], [kalshi])
                mock_groq.assert_not_called()
        finally:
            matcher_module._rejected_keys = original_rejected

    async def test_skips_cached_db_matches(self):
        poly = make_market(id="poly:CACHED", platform="polymarket")
        kalshi = make_market(id="kalshi:CACHED", platform="kalshi")

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

    async def test_below_confidence_threshold_skipped(self):
        """Candidates with confidence < _CONFIDENCE_THRESHOLD produce no confirmed matches."""
        poly = make_market(id="poly:LOW", platform="polymarket")
        kalshi = make_market(id="kalshi:LOW", platform="kalshi")
        fake_candidates = [{"poly_id": "poly:LOW", "kalshi_id": "kalshi:LOW", "confidence": 0.5}]

        with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
             patch("app.services.matcher.find_embedding_candidates",
                   new_callable=AsyncMock, return_value=fake_candidates), \
             patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()):

            result = await match_markets([poly], [kalshi])

        assert result == []

    async def test_respects_max_confirmations_per_cycle(self):
        """LLM calls are capped at _MAX_CONFIRMATIONS_PER_CYCLE.

        All candidate market IDs are included in the market lists so that
        _pass2_confirm proceeds to call _call_groq on each one, confirming
        the cap is enforced against real LLM invocations.
        """
        cap = matcher_module._MAX_CONFIRMATIONS_PER_CYCLE
        n = cap + 10

        # All markets share the same end_date so the Pass 1.5 date pre-filter
        # passes without filtering anything out
        shared_end = datetime(2026, 3, 31, tzinfo=timezone.utc)

        poly_markets = [
            make_market(id=f"poly:P{i}", platform="polymarket", end_date=shared_end)
            for i in range(n)
        ]
        kalshi_markets = [
            make_market(id=f"kalshi:K{i}", platform="kalshi", end_date=shared_end)
            for i in range(n)
        ]
        fake_candidates = [
            {"poly_id": f"poly:P{i}", "kalshi_id": f"kalshi:K{i}", "confidence": 0.85}
            for i in range(n)
        ]
        # Groq rejects all — we're counting calls, not confirmed results
        groq_response = '{"confirmed": false, "reasoning": "Different events"}'

        original_rejected = matcher_module._rejected_keys.copy()
        try:
            matcher_module._rejected_keys.clear()

            with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
                 patch("app.services.matcher.find_embedding_candidates",
                       new_callable=AsyncMock, return_value=fake_candidates), \
                 patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock,
                       return_value=groq_response) as mock_groq:

                await match_markets(poly_markets, kalshi_markets)

            # LLM calls must not exceed the cap
            assert mock_groq.call_count <= cap
            # And we should have hit the cap (not stopped early for another reason)
            assert mock_groq.call_count == cap
        finally:
            matcher_module._rejected_keys = original_rejected

    async def test_no_embedding_candidates_returns_empty(self):
        poly = make_market(id="poly:A", platform="polymarket")
        kalshi = make_market(id="kalshi:B", platform="kalshi")

        with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
             patch("app.services.matcher.find_embedding_candidates",
                   new_callable=AsyncMock, return_value=[]), \
             patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()):

            result = await match_markets([poly], [kalshi])

        assert result == []

    async def test_date_mismatched_candidates_skipped(self):
        """Pass 1.5: pairs with dates >24h apart are skipped without an LLM call."""
        poly = make_market(
            id="poly:DATE", platform="polymarket",
            end_date=datetime(2026, 2, 28, tzinfo=timezone.utc),
        )
        kalshi = make_market(
            id="kalshi:DATE", platform="kalshi",
            end_date=datetime(2026, 3, 31, tzinfo=timezone.utc),
        )
        fake_candidates = [{"poly_id": "poly:DATE", "kalshi_id": "kalshi:DATE", "confidence": 0.9}]

        original_rejected = matcher_module._rejected_keys.copy()
        try:
            matcher_module._rejected_keys.discard(_cache_key("poly:DATE", "kalshi:DATE"))

            with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
                 patch("app.services.matcher.find_embedding_candidates",
                       new_callable=AsyncMock, return_value=fake_candidates), \
                 patch("app.services.matcher.get_db", new_callable=AsyncMock, return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock) as mock_groq:

                result = await match_markets([poly], [kalshi])

            assert result == []
            mock_groq.assert_not_called()
        finally:
            matcher_module._rejected_keys = original_rejected


# ---------------------------------------------------------------------------
# Price-based inversion detection (orientation == "unknown" branch)
# ---------------------------------------------------------------------------

class TestPriceBasedInversionDetection:
    """Tests for the price-based inversion check added in the 'unknown' orientation branch.

    When check_sports_orientation() returns 'unknown' (e.g. compound surname mismatch —
    Kalshi uses 'DAV' for Davidovich Fokina, Poly uses 'fokina'), the matcher falls back
    to comparing YES prices. If the inverted interpretation (poly_yes ≈ 1 - kalshi_yes)
    fits significantly better than the aligned one, the match is rejected.

    Bellucci vs Fokina (ATP) live case:
      Poly YES=Bellucci (price 0.20), Kalshi YES=Fokina (price 0.805)
      aligned_diff  = |0.20 - 0.805| = 0.605  (bad fit)
      inverted_diff = |0.20 - 0.195| = 0.005  (great fit — same event, opposite sides)
      → rejected as inverted
    """

    _GROQ_CONFIRMED = '{"confirmed": true, "inverted": false, "reasoning": "Same match"}'
    _FAKE_PARSED = ("atp", "bellucc", "fokina", "2026-02-25")

    async def test_bellucci_fokina_inverted_prices_rejected(self):
        """Exact live case: poly_yes=0.20, kalshi_yes=0.805, orientation=unknown → rejected."""
        poly = make_market(id="poly:bellucci", platform="polymarket",
                           yes_price=0.20, no_price=0.80)
        kalshi = make_market(id="kalshi:beldav", platform="kalshi",
                             yes_price=0.805, no_price=0.195)
        candidate = {"poly_id": "poly:bellucci", "kalshi_id": "kalshi:beldav",
                     "confidence": 0.80}

        original_rejected = matcher_module._rejected_keys.copy()
        try:
            matcher_module._rejected_keys.clear()

            with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
                 patch("app.services.matcher.find_embedding_candidates",
                       new_callable=AsyncMock, return_value=[candidate]), \
                 patch("app.services.matcher.get_db", new_callable=AsyncMock,
                       return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock,
                       return_value=self._GROQ_CONFIRMED), \
                 patch("app.services.matcher.parse_poly_slug",
                       return_value=self._FAKE_PARSED), \
                 patch("app.services.matcher.check_sports_orientation",
                       return_value="unknown"):

                result = await match_markets([poly], [kalshi])

            assert result == []
        finally:
            matcher_module._rejected_keys = original_rejected

    async def test_price_inversion_adds_to_rejection_cache(self):
        """Price-inverted pair is added to _rejected_keys to prevent re-evaluation."""
        poly = make_market(id="poly:inv-cache", platform="polymarket",
                           yes_price=0.20, no_price=0.80)
        kalshi = make_market(id="kalshi:inv-cache", platform="kalshi",
                             yes_price=0.805, no_price=0.195)
        candidate = {"poly_id": "poly:inv-cache", "kalshi_id": "kalshi:inv-cache",
                     "confidence": 0.80}
        key = _cache_key("poly:inv-cache", "kalshi:inv-cache")

        original_rejected = matcher_module._rejected_keys.copy()
        try:
            matcher_module._rejected_keys.discard(key)

            with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
                 patch("app.services.matcher.find_embedding_candidates",
                       new_callable=AsyncMock, return_value=[candidate]), \
                 patch("app.services.matcher.get_db", new_callable=AsyncMock,
                       return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock,
                       return_value=self._GROQ_CONFIRMED), \
                 patch("app.services.matcher.parse_poly_slug",
                       return_value=self._FAKE_PARSED), \
                 patch("app.services.matcher.check_sports_orientation",
                       return_value="unknown"):

                await match_markets([poly], [kalshi])

            assert key in matcher_module._rejected_keys
        finally:
            matcher_module._rejected_keys = original_rejected

    async def test_aligned_prices_pass_through(self):
        """Small aligned_diff (< 0.20) → price check does not reject the match."""
        # poly_yes=0.75, kalshi_yes=0.78 → aligned_diff=0.03, threshold not met → pass
        poly = make_market(id="poly:aligned", platform="polymarket",
                           yes_price=0.75, no_price=0.25)
        kalshi = make_market(id="kalshi:aligned", platform="kalshi",
                             yes_price=0.78, no_price=0.22)
        candidate = {"poly_id": "poly:aligned", "kalshi_id": "kalshi:aligned",
                     "confidence": 0.80}

        original_rejected = matcher_module._rejected_keys.copy()
        try:
            matcher_module._rejected_keys.clear()

            with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
                 patch("app.services.matcher.find_embedding_candidates",
                       new_callable=AsyncMock, return_value=[candidate]), \
                 patch("app.services.matcher.get_db", new_callable=AsyncMock,
                       return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock,
                       return_value=self._GROQ_CONFIRMED), \
                 patch("app.services.matcher.parse_poly_slug",
                       return_value=("atp", "federer", "djokovic", "2026-02-25")), \
                 patch("app.services.matcher.check_sports_orientation",
                       return_value="unknown"):

                result = await match_markets([poly], [kalshi])

            assert len(result) == 1
            assert result[0]["polymarket_id"] == "poly:aligned"
        finally:
            matcher_module._rejected_keys = original_rejected

    async def test_near_fifty_fifty_not_rejected(self):
        """Near 50/50 prices — aligned_diff is tiny, threshold not met → pass through."""
        # poly_yes=0.50, kalshi_yes=0.52 → aligned_diff=0.02 < 0.20 → pass
        poly = make_market(id="poly:fifty", platform="polymarket",
                           yes_price=0.50, no_price=0.50)
        kalshi = make_market(id="kalshi:fifty", platform="kalshi",
                             yes_price=0.52, no_price=0.48)
        candidate = {"poly_id": "poly:fifty", "kalshi_id": "kalshi:fifty",
                     "confidence": 0.80}

        original_rejected = matcher_module._rejected_keys.copy()
        try:
            matcher_module._rejected_keys.clear()

            with patch.object(matcher_module.settings, "GROQ_API_KEY", "fake-key"), \
                 patch("app.services.matcher.find_embedding_candidates",
                       new_callable=AsyncMock, return_value=[candidate]), \
                 patch("app.services.matcher.get_db", new_callable=AsyncMock,
                       return_value=make_db_mock()), \
                 patch("app.services.matcher._call_groq", new_callable=AsyncMock,
                       return_value=self._GROQ_CONFIRMED), \
                 patch("app.services.matcher.parse_poly_slug",
                       return_value=("atp", "playerA", "playerB", "2026-02-25")), \
                 patch("app.services.matcher.check_sports_orientation",
                       return_value="unknown"):

                result = await match_markets([poly], [kalshi])

            assert len(result) == 1
        finally:
            matcher_module._rejected_keys = original_rejected
