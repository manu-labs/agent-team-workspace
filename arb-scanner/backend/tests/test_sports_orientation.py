"""Tests for YES/NO orientation detection in sports matching.

Validates check_sports_orientation() and _teams_match() against the 13 cases
specified in issue #301, plus edge cases.
"""

import pytest
from app.services.sports_matcher import (
    _teams_match,
    check_sports_orientation,
    match_sports_deterministic,
)


# ---------------------------------------------------------------------------
# _teams_match unit tests
# ---------------------------------------------------------------------------

class TestTeamsMatch:
    def test_exact_match(self):
        assert _teams_match("okc", "okc") is True

    def test_suffix_truncated(self):
        # Kalshi truncated Townsend to "tow"
        assert _teams_match("tow", "townsen") is True

    def test_poly_truncated(self):
        # Kalshi has "bartunk", Poly has "bar" (prefix of Bartunkova)
        assert _teams_match("bartunk", "bar") is True

    def test_alias_resolved(self):
        # TEAM_ALIASES: utah → uta; Kalshi uses "uta"
        assert _teams_match("uta", "utah") is True

    def test_esports_digit_preserved(self):
        # "c9" is the team code, not a disambiguation digit
        assert _teams_match("c9", "c9") is True

    def test_no_match(self):
        assert _teams_match("tow", "bartunk") is False

    def test_too_short_single_char(self):
        # min 2 chars to avoid false positives
        assert _teams_match("c", "col") is False

    def test_empty_suffix(self):
        assert _teams_match("", "okc") is False

    def test_empty_poly_team(self):
        assert _teams_match("okc", "") is False


# ---------------------------------------------------------------------------
# check_sports_orientation unit tests (13 cases from issue #301)
# ---------------------------------------------------------------------------

class TestCheckSportsOrientation:

    # Case 1: WTA ALIGNED — Kalshi YES = Bartunkova = team1
    def test_wta_aligned_bartunkova(self):
        result = check_sports_orientation(
            "kalshi:KXWTAMATCH-26FEB25BARTOW-BAR",
            "bartunk",
            "tow",
        )
        assert result == "aligned"

    # Case 2: WTA INVERTED — Kalshi YES = Townsend = team2
    def test_wta_inverted_townsend(self):
        result = check_sports_orientation(
            "kalshi:KXWTAMATCH-26FEB25BARTOW-TOW",
            "bartunk",
            "tow",
        )
        assert result == "inverted"

    # Case 3: NBA ALIGNED — Kalshi YES = OKC = team1
    def test_nba_aligned_okc(self):
        result = check_sports_orientation(
            "kalshi:KXNBAGAME-26FEB25OKCDET-OKC",
            "okc",
            "det",
        )
        assert result == "aligned"

    # Case 4: NBA INVERTED — Kalshi YES = DET = team2
    def test_nba_inverted_det(self):
        result = check_sports_orientation(
            "kalshi:KXNBAGAME-26FEB25OKCDET-DET",
            "okc",
            "det",
        )
        assert result == "inverted"

    # Case 5: NHL alias — Poly uses "utah", Kalshi uses "UTA" — ALIGNED (utah→uta alias)
    def test_nhl_alias_utah_aligned(self):
        result = check_sports_orientation(
            "kalshi:KXNHLGAME-26FEB25COLUTA-UTA",
            "utah",
            "col",
        )
        # Poly team1="utah" (YES side); Kalshi YES="uta" → alias match → aligned
        assert result == "aligned"

    # Case 5b: NHL alias — COL is team1, UTA is team2
    def test_nhl_alias_col_aligned(self):
        result = check_sports_orientation(
            "kalshi:KXNHLGAME-26FEB25COLUTA-COL",
            "col",
            "utah",
        )
        assert result == "aligned"

    # Case 6: LoL esports — "c9" ALIGNED
    def test_lol_esports_c9_aligned(self):
        result = check_sports_orientation(
            "kalshi:KXLOLGAME-26FEB28C9TLM-C9",
            "c9",
            "tlm",
        )
        assert result == "aligned"

    # Case 7: LoL esports — team2 (TLM) → INVERTED
    def test_lol_esports_tlm_inverted(self):
        result = check_sports_orientation(
            "kalshi:KXLOLGAME-26FEB28C9TLM-TLM",
            "c9",
            "tlm",
        )
        assert result == "inverted"

    # Case 8: UCL — suffix "RMA" matches "rma" (stripped from "rma1") → ALIGNED
    def test_ucl_rma_aligned(self):
        # Poly slug "ucl-rma1-ben" → after strip_ucl_suffix: team1="rma"
        result = check_sports_orientation(
            "kalshi:KXUCLGAME-26FEB25RMABEN-RMA",
            "rma",   # already stripped by parse_poly_slug
            "ben",
        )
        assert result == "aligned"

    # Case 9: Non-sports ticker → UNKNOWN
    def test_non_sports_ticker_unknown(self):
        result = check_sports_orientation(
            "kalshi:KXBTC-26FEB25-YES",
            "btc",
            "usd",
        )
        assert result == "unknown"

    # Case 10: Market with no YES suffix (only 1 hyphen in ticker) → UNKNOWN
    def test_single_hyphen_unknown(self):
        result = check_sports_orientation(
            "kalshi:KXNBAGAME-26FEB25OKCDET",
            "okc",
            "det",
        )
        assert result == "unknown"

    # Case 11: Esports long codes — Dota2 ALIGNED
    def test_dota2_long_codes_aligned(self):
        result = check_sports_orientation(
            "kalshi:KXDOTA2GAME-26FEB25LIQUIDPARI-LIQUID",
            "liquid",
            "pari",
        )
        assert result == "aligned"

    # Case 12: Esports long codes — Dota2 INVERTED
    def test_dota2_long_codes_inverted(self):
        result = check_sports_orientation(
            "kalshi:KXDOTA2GAME-26FEB25LIQUIDPARI-PARI",
            "liquid",
            "pari",
        )
        assert result == "inverted"

    # Case 13: market_id without "kalshi:" prefix → UNKNOWN
    def test_missing_kalshi_prefix_unknown(self):
        result = check_sports_orientation(
            "KXNBAGAME-26FEB25OKCDET-OKC",
            "okc",
            "det",
        )
        assert result == "unknown"


# ---------------------------------------------------------------------------
# Integration: match_sports_deterministic with orientation selection
# ---------------------------------------------------------------------------

class TestMatchSportsDeterministicOrientation:

    def _make_poly(self, mid, slug, smt="moneyline"):
        return {"id": mid, "event_slug": slug, "sports_market_type": smt,
                "yes_price": 0.55, "no_price": 0.45}

    def _make_kalshi(self, mid, ticker):
        return {"id": mid, "event_ticker": ticker,
                "yes_price": 0.53, "no_price": 0.47}

    # Integration test 11: both aligned and inverted Kalshi markets present
    # → only aligned match returned
    def test_prefers_aligned_over_inverted(self):
        poly = [self._make_poly("poly:1", "nba-okc-det-2026-02-25")]
        kalshi = [
            self._make_kalshi("kalshi:KXNBAGAME-26FEB25OKCDET-OKC",
                               "KXNBAGAME-26FEB25OKCDET"),
            self._make_kalshi("kalshi:KXNBAGAME-26FEB25OKCDET-DET",
                               "KXNBAGAME-26FEB25OKCDET"),
        ]
        results = match_sports_deterministic(poly, kalshi)
        assert len(results) == 1
        assert results[0]["kalshi_id"] == "kalshi:KXNBAGAME-26FEB25OKCDET-OKC"
        assert results[0]["inverted"] is False

    # Integration test 12: only inverted Kalshi market exists
    # → match returned with inverted=True
    def test_falls_back_to_inverted(self):
        poly = [self._make_poly("poly:1", "nba-okc-det-2026-02-25")]
        kalshi = [
            self._make_kalshi("kalshi:KXNBAGAME-26FEB25OKCDET-DET",
                               "KXNBAGAME-26FEB25OKCDET"),
        ]
        results = match_sports_deterministic(poly, kalshi)
        assert len(results) == 1
        assert results[0]["kalshi_id"] == "kalshi:KXNBAGAME-26FEB25OKCDET-DET"
        assert results[0]["inverted"] is True

    # Integration test 13: aligned match → correct orientation
    def test_aligned_match_inverted_false(self):
        poly = [self._make_poly("poly:1", "wta-bartunk-tow-2026-02-25")]
        kalshi = [
            self._make_kalshi("kalshi:KXWTAMATCH-26FEB25BARTOW-BAR",
                               "KXWTAMATCH-26FEB25BARTOW"),
        ]
        results = match_sports_deterministic(poly, kalshi)
        assert len(results) == 1
        assert results[0]["inverted"] is False

    def test_no_duplicate_matches_per_poly_market(self):
        """Even with multiple Kalshi variants, Poly market gets only one match."""
        poly = [self._make_poly("poly:1", "nba-gsw-mem-2026-02-25")]
        kalshi = [
            self._make_kalshi("kalshi:KXNBAGAME-26FEB25GSWMEM-GSW",
                               "KXNBAGAME-26FEB25GSWMEM"),
            self._make_kalshi("kalshi:KXNBAGAME-26FEB25GSWMEM-MEM",
                               "KXNBAGAME-26FEB25GSWMEM"),
        ]
        results = match_sports_deterministic(poly, kalshi)
        assert len(results) == 1
