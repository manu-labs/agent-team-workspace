"""Tests for platform-specific market normalizers."""
from datetime import datetime, timezone

import pytest

from app.services.kalshi import _normalize as kalshi_normalize, _slugify
from app.services.polymarket import _normalize as poly_normalize


# ---------------------------------------------------------------------------
# Kalshi: _slugify
# ---------------------------------------------------------------------------

class TestKalshiSlugify:
    def test_basic_lowercase_with_hyphen(self):
        assert _slugify("elon mars") == "elon-mars"

    def test_special_chars_removed(self):
        # Counter-Strike 2 → "counterstrike-2" (hyphen removed, space → hyphen)
        assert _slugify("Counter-Strike 2 Game") == "counterstrike-2-game"

    def test_multiple_spaces_collapse(self):
        assert _slugify("hello  world") == "hello-world"

    def test_leading_trailing_stripped(self):
        assert _slugify("  test  ") == "test"

    def test_empty_string(self):
        assert _slugify("") == ""

    def test_all_special_chars(self):
        assert _slugify("!@#$%") == ""

    def test_numbers_preserved(self):
        assert _slugify("Series 2 Final") == "series-2-final"

    def test_already_slug(self):
        assert _slugify("elon-mars") == "elon-mars"

    def test_multiple_consecutive_hyphens_collapse(self):
        # After removing special chars, consecutive hyphens collapse to one
        result = _slugify("a--b")
        assert "--" not in result


# ---------------------------------------------------------------------------
# Kalshi: _normalize
# ---------------------------------------------------------------------------

class TestKalshiNormalize:
    def _make_raw(self, **overrides):
        base = {
            "ticker": "BTCUSD-25MAR31",
            "title": "Will BTC be above $100K?",
            "last_price": 60,
            "yes_ask": 62,
            "yes_bid": 58,
            "no_ask": 40,
            "no_bid": 38,
            "volume": 5000,
            "event_ticker": "BTCUSD",
            "open_time": "2026-01-01T00:00:00Z",
            "close_time": "2026-03-31T00:00:00Z",
            "status": "open",
        }
        base.update(overrides)
        return base

    def test_basic_normalize(self):
        result = kalshi_normalize(self._make_raw(), {})
        assert result is not None
        assert result.id == "kalshi:BTCUSD-25MAR31"
        assert result.platform == "kalshi"
        assert result.question == "Will BTC be above $100K?"

    def test_yes_price_from_last_price(self):
        raw = self._make_raw(last_price=60)
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert abs(result.yes_price - 0.60) < 1e-9

    def test_yes_price_fallback_to_midpoint(self):
        # last_price=0 → midpoint of (yes_bid + yes_ask) / 2
        raw = self._make_raw(last_price=0, yes_ask=62, yes_bid=58)
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert abs(result.yes_price - 0.60) < 1e-9  # (62+58)/200

    def test_yes_price_fallback_to_ask_only(self):
        # last_price=0, yes_bid=0 → use yes_ask alone
        raw = self._make_raw(last_price=0, yes_ask=65, yes_bid=0)
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert abs(result.yes_price - 0.65) < 1e-9

    def test_no_price_from_no_ask(self):
        raw = self._make_raw(no_ask=40, no_bid=38)
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert abs(result.no_price - 0.40) < 1e-9

    def test_no_price_fallback_to_no_bid(self):
        raw = self._make_raw(no_ask=0, no_bid=38)
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert abs(result.no_price - 0.38) < 1e-9

    def test_no_price_fallback_to_complement(self):
        # no_ask=0, no_bid=0 → 1 - yes_price
        raw = self._make_raw(last_price=60, no_ask=0, no_bid=0)
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert abs(result.no_price - 0.40) < 1e-9

    def test_missing_ticker_returns_none(self):
        raw = self._make_raw()
        raw.pop("ticker")
        assert kalshi_normalize(raw, {}) is None

    def test_empty_ticker_returns_none(self):
        assert kalshi_normalize(self._make_raw(ticker=""), {}) is None

    def test_missing_title_returns_none(self):
        assert kalshi_normalize(self._make_raw(title=""), {}) is None

    def test_volume_set_correctly(self):
        raw = self._make_raw(volume=12345)
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert result.volume == 12345.0

    def test_category_from_series_data(self):
        raw = self._make_raw(event_ticker="BTCUSD")
        series_data = {"BTCUSD": {"category": "Crypto", "title": "BTC Price"}}
        result = kalshi_normalize(raw, series_data)
        assert result is not None
        assert result.category == "Crypto"

    def test_prices_clamped_to_0_1(self):
        raw = self._make_raw(last_price=150, no_ask=150)
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert 0.0 <= result.yes_price <= 1.0
        assert 0.0 <= result.no_price <= 1.0

    def test_end_date_parsed(self):
        raw = self._make_raw(close_time="2026-03-31T00:00:00Z")
        result = kalshi_normalize(raw, {})
        assert result is not None
        assert result.end_date is not None


# ---------------------------------------------------------------------------
# Polymarket: _normalize
# ---------------------------------------------------------------------------

class TestPolymarketNormalize:
    def _make_raw(self, **overrides):
        base = {
            "id": "abc-123",
            "question": "Will BTC hit $100k by March?",
            "outcomePrices": "[0.65, 0.35]",
            "outcomes": '["Yes", "No"]',
            "volume": "10000",
            "endDate": "2026-03-31T00:00:00Z",
            "tags": [{"label": "Crypto"}],
            "events": [{"slug": "btc-100k-march"}],
            "groupItemTitle": "",
            "clobTokenIds": '["token-yes-id", "token-no-id"]',
        }
        base.update(overrides)
        return base

    def test_basic_normalize(self):
        result = poly_normalize(self._make_raw())
        assert result is not None
        assert result.id == "polymarket:abc-123"
        assert result.platform == "polymarket"
        assert result.question == "Will BTC hit $100k by March?"

    def test_yes_no_prices_from_outcomes(self):
        result = poly_normalize(self._make_raw(outcomePrices="[0.65, 0.35]"))
        assert result is not None
        assert abs(result.yes_price - 0.65) < 1e-9
        assert abs(result.no_price - 0.35) < 1e-9

    def test_swaps_prices_when_first_outcome_is_no(self):
        raw = self._make_raw(outcomePrices="[0.35, 0.65]", outcomes='["No", "Yes"]')
        result = poly_normalize(raw)
        assert result is not None
        # After swap: yes_price=0.65, no_price=0.35
        assert abs(result.yes_price - 0.65) < 1e-9
        assert abs(result.no_price - 0.35) < 1e-9

    def test_clob_token_swapped_when_first_outcome_is_no(self):
        raw = self._make_raw(
            outcomePrices="[0.35, 0.65]",
            outcomes='["No", "Yes"]',
            clobTokenIds='["token-no-id", "token-yes-id"]',
        )
        result = poly_normalize(raw)
        assert result is not None
        # YES token should be index 1 when outcomes were swapped
        assert result.clob_token_ids == "token-yes-id"

    def test_game_level_filter_game(self):
        result = poly_normalize(self._make_raw(groupItemTitle="Game 1 Winner"))
        assert result is None

    def test_game_level_filter_map(self):
        result = poly_normalize(self._make_raw(groupItemTitle="Map 2 Winner"))
        assert result is None

    def test_game_level_filter_set(self):
        result = poly_normalize(self._make_raw(groupItemTitle="Set 3 Winner"))
        assert result is None

    def test_game_level_filter_round(self):
        result = poly_normalize(self._make_raw(groupItemTitle="Round 1"))
        assert result is None

    def test_game_level_filter_case_insensitive(self):
        result = poly_normalize(self._make_raw(groupItemTitle="game 1 winner"))
        assert result is None

    def test_non_game_group_title_allowed(self):
        result = poly_normalize(self._make_raw(groupItemTitle="Series Winner"))
        assert result is not None

    def test_empty_group_title_allowed(self):
        result = poly_normalize(self._make_raw(groupItemTitle=""))
        assert result is not None

    def test_missing_id_returns_none(self):
        raw = self._make_raw()
        raw.pop("id")
        assert poly_normalize(raw) is None

    def test_empty_question_returns_none(self):
        assert poly_normalize(self._make_raw(question="")) is None

    def test_too_few_prices_returns_none(self):
        assert poly_normalize(self._make_raw(outcomePrices="[0.65]")) is None

    def test_category_from_tag_label(self):
        result = poly_normalize(self._make_raw(tags=[{"label": "Sports"}]))
        assert result is not None
        assert result.category == "Sports"

    def test_category_from_tag_name(self):
        result = poly_normalize(self._make_raw(tags=[{"name": "Politics"}]))
        assert result is not None
        assert result.category == "Politics"

    def test_volume_parsed_from_string(self):
        result = poly_normalize(self._make_raw(volume="50000.5"))
        assert result is not None
        assert result.volume == 50000.5

    def test_end_date_parsed(self):
        result = poly_normalize(self._make_raw(endDate="2026-03-31T00:00:00Z"))
        assert result is not None
        assert result.end_date == datetime(2026, 3, 31, tzinfo=timezone.utc)

    def test_missing_end_date_returns_none_field(self):
        raw = self._make_raw()
        raw.pop("endDate")
        result = poly_normalize(raw)
        assert result is not None
        assert result.end_date is None

    def test_clob_token_ids_extracted(self):
        result = poly_normalize(self._make_raw(clobTokenIds='["yes-token", "no-token"]'))
        assert result is not None
        assert result.clob_token_ids == "yes-token"
