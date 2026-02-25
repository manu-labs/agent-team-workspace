"""Tests for app/services/sports_matcher.py

Tests cover:
- parse_poly_slug: 10+ cases including UCL trailing digit, La Liga 2, edge cases
- parse_kalshi_event_ticker: 10+ cases including YY-MMM-DD format, parlay filter, edge cases
- canonical_sports_key: order-independence, sorting
- match_sports_deterministic: 10+ known cross-platform pairs, moneyline filter, parlay filter
"""

import pytest

from app.services.sports_matcher import (
    KALSHI_LEAGUE_MAP,
    POLY_LEAGUE_MAP,
    canonical_sports_key,
    match_sports_deterministic,
    parse_kalshi_event_ticker,
    parse_poly_slug,
)


# ---------------------------------------------------------------------------
# parse_poly_slug
# ---------------------------------------------------------------------------

class TestParsePolySlug:

    def test_nba_basic(self):
        assert parse_poly_slug("nba-okc-det-2026-02-25") == ("nba", "okc", "det", "2026-02-25")

    def test_nba_reversed_teams(self):
        # Team order preserved in parse — sorting happens in canonical_sports_key
        assert parse_poly_slug("nba-det-okc-2026-02-25") == ("nba", "det", "okc", "2026-02-25")

    def test_ucl_trailing_digit_t1(self):
        # "rma1" → "rma" (UCL Polymarket slugs append digit to avoid slug collision)
        assert parse_poly_slug("ucl-rma1-ben-2026-02-25") == ("ucl", "rma", "ben", "2026-02-25")

    def test_ucl_trailing_digit_both(self):
        assert parse_poly_slug("ucl-ata1-bvb-2026-02-25") == ("ucl", "ata", "bvb", "2026-02-25")

    def test_laliga2_es2_prefix(self):
        # "es2" → "laliga2" in canonical form
        assert parse_poly_slug("es2-ceu-cor-2026-02-08") == ("laliga2", "ceu", "cor", "2026-02-08")

    def test_nhl(self):
        assert parse_poly_slug("nhl-bos-tor-2026-02-25") == ("nhl", "bos", "tor", "2026-02-25")

    def test_epl(self):
        assert parse_poly_slug("epl-liv-mci-2026-03-01") == ("epl", "liv", "mci", "2026-03-01")

    def test_lol_esports(self):
        assert parse_poly_slug("lol-c9-tlm-2026-03-01") == ("lol", "c9", "tlm", "2026-03-01")

    def test_cs2_esports(self):
        assert parse_poly_slug("cs2-nrg-faz-2026-03-15") == ("cs2", "nrg", "faz", "2026-03-15")

    def test_dota2_esports(self):
        assert parse_poly_slug("dota2-liq-aur-2026-03-15") == ("dota2", "liq", "aur", "2026-03-15")

    def test_bundesliga_bun_prefix(self):
        assert parse_poly_slug("bun-bay-bvb-2026-03-08") == ("bundesliga", "bay", "bvb", "2026-03-08")

    def test_suffix_ignored(self):
        # Extra slug suffix after date should be ignored
        assert parse_poly_slug("nba-okc-det-2026-02-25-more-markets") == ("nba", "okc", "det", "2026-02-25")

    def test_unknown_league_returns_none(self):
        # "btc" is not in POLY_LEAGUE_MAP
        assert parse_poly_slug("btc-usd-100000-2026-03-31") is None

    def test_empty_string_returns_none(self):
        assert parse_poly_slug("") is None

    def test_no_date_returns_none(self):
        assert parse_poly_slug("nba-okc-det") is None

    def test_malformed_date_returns_none(self):
        # Date portion must be YYYY-MM-DD
        assert parse_poly_slug("nba-okc-det-26-02-25") is None

    def test_non_sports_slug_returns_none(self):
        assert parse_poly_slug("will-elon-musk-buy-twitter") is None

    def test_case_insensitive(self):
        result = parse_poly_slug("NBA-OKC-DET-2026-02-25")
        assert result == ("nba", "okc", "det", "2026-02-25")


# ---------------------------------------------------------------------------
# parse_kalshi_event_ticker
# ---------------------------------------------------------------------------

class TestParseKalshiEventTicker:

    def test_nba_basic(self):
        # Format: KX{LEAGUE}GAME-{YY}{MMM}{DD}{TEAM1}{TEAM2}
        assert parse_kalshi_event_ticker("KXNBAGAME-26FEB25OKCDET") == ("nba", "okc", "det", "2026-02-25")

    def test_nba_different_game(self):
        assert parse_kalshi_event_ticker("KXNBAGAME-26FEB25SACHOU") == ("nba", "sac", "hou", "2026-02-25")

    def test_nba_third_game(self):
        assert parse_kalshi_event_ticker("KXNBAGAME-26FEB25GSWMEM") == ("nba", "gsw", "mem", "2026-02-25")

    def test_ucl(self):
        assert parse_kalshi_event_ticker("KXUCLGAME-26FEB25RMABEN") == ("ucl", "rma", "ben", "2026-02-25")

    def test_ucl_second_game(self):
        assert parse_kalshi_event_ticker("KXUCLGAME-26FEB25ATABVB") == ("ucl", "ata", "bvb", "2026-02-25")

    def test_laliga2(self):
        assert parse_kalshi_event_ticker("KXLALIGA2GAME-26FEB08CEUCOR") == ("laliga2", "ceu", "cor", "2026-02-08")

    def test_nhl(self):
        assert parse_kalshi_event_ticker("KXNHLGAME-26FEB25BOSTOR") == ("nhl", "bos", "tor", "2026-02-25")

    def test_epl(self):
        assert parse_kalshi_event_ticker("KXEPLGAME-26MAR01LIVMCI") == ("epl", "liv", "mci", "2026-03-01")

    def test_lol(self):
        assert parse_kalshi_event_ticker("KXLOLGAME-26MAR01C9TLMX") is None  # 7 chars → suffix len wrong

    def test_cs2(self):
        assert parse_kalshi_event_ticker("KXCS2GAME-26MAR15NRGFAZ") == ("cs2", "nrg", "faz", "2026-03-15")

    def test_parlay_filtered(self):
        # Multi-game parlays should not be parseable (KXMVESPORTSMULTIGAME not in KALSHI_LEAGUE_MAP)
        assert parse_kalshi_event_ticker("KXMVESPORTSMULTIGAME-26FEB25OKCDET") is None

    def test_empty_string_returns_none(self):
        assert parse_kalshi_event_ticker("") is None

    def test_no_dash_returns_none(self):
        assert parse_kalshi_event_ticker("KXNBAGAME26FEB25OKCDET") is None

    def test_unknown_series_returns_none(self):
        assert parse_kalshi_event_ticker("KXUNKNOWN-26FEB25OKCDET") is None

    def test_invalid_suffix_format_returns_none(self):
        # Suffix doesn't match YYMMMDD + 6 alpha chars
        assert parse_kalshi_event_ticker("KXNBAGAME-INVALIDFORMAT") is None

    def test_lowercase_handled(self):
        # series_prefix is uppercased internally
        assert parse_kalshi_event_ticker("kxnbagame-26FEB25OKCDET") == ("nba", "okc", "det", "2026-02-25")

    def test_date_yymmmdd_format_is_correct(self):
        # Verify YY-MMM-DD format: "26FEB25" → year=2026, month=02, day=25
        result = parse_kalshi_event_ticker("KXNBAGAME-26FEB25OKCDET")
        assert result is not None
        _, _, _, date_str = result
        assert date_str == "2026-02-25"  # NOT 2025-02-26


# ---------------------------------------------------------------------------
# canonical_sports_key
# ---------------------------------------------------------------------------

class TestCanonicalSportsKey:

    def test_teams_sorted_alphabetically(self):
        key = canonical_sports_key("nba", "okc", "det", "2026-02-25")
        assert key == "nba:det-okc:2026-02-25"

    def test_order_independent(self):
        key1 = canonical_sports_key("nba", "okc", "det", "2026-02-25")
        key2 = canonical_sports_key("nba", "det", "okc", "2026-02-25")
        assert key1 == key2 == "nba:det-okc:2026-02-25"

    def test_ucl_key(self):
        key = canonical_sports_key("ucl", "rma", "ben", "2026-02-25")
        assert key == "ucl:ben-rma:2026-02-25"

    def test_laliga2_key(self):
        key = canonical_sports_key("laliga2", "ceu", "cor", "2026-02-08")
        assert key == "laliga2:ceu-cor:2026-02-08"

    def test_different_dates_produce_different_keys(self):
        key1 = canonical_sports_key("nba", "okc", "det", "2026-02-25")
        key2 = canonical_sports_key("nba", "okc", "det", "2026-02-26")
        assert key1 != key2


# ---------------------------------------------------------------------------
# match_sports_deterministic
# ---------------------------------------------------------------------------

def _poly(market_id: str, slug: str, sports_market_type: str = "moneyline") -> dict:
    return {
        "id": f"polymarket:{market_id}",
        "question": f"Mock question for {market_id}",
        "event_slug": slug,
        "sports_market_type": sports_market_type,
        "yes_price": 0.55,
        "no_price": 0.45,
    }


def _kalshi(market_id: str, event_ticker: str) -> dict:
    return {
        "id": f"kalshi:{market_id}",
        "question": f"Mock question for {market_id}",
        "event_ticker": event_ticker,
        "yes_price": 0.60,
        "no_price": 0.40,
    }


class TestMatchSportsDeterministic:

    def test_nba_okc_det_matches(self):
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1
        assert result[0]["poly_id"] == "polymarket:P1"
        assert result[0]["kalshi_id"] == "kalshi:K1"
        assert result[0]["confidence"] == 1.0
        assert "nba:det-okc:2026-02-25" in result[0]["reasoning"]

    def test_nba_sac_hou_matches(self):
        poly = [_poly("P2", "nba-sac-hou-2026-02-25")]
        kalshi = [_kalshi("K2", "KXNBAGAME-26FEB25SACHOU")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1
        assert result[0]["poly_id"] == "polymarket:P2"
        assert result[0]["kalshi_id"] == "kalshi:K2"

    def test_nba_gsw_mem_matches(self):
        poly = [_poly("P3", "nba-gsw-mem-2026-02-25")]
        kalshi = [_kalshi("K3", "KXNBAGAME-26FEB25GSWMEM")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_ucl_rma_trailing_digit(self):
        # "rma1" → "rma" → matches "RMA" in KXUCLGAME
        poly = [_poly("P4", "ucl-rma1-ben-2026-02-25")]
        kalshi = [_kalshi("K4", "KXUCLGAME-26FEB25RMABEN")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1
        assert result[0]["poly_id"] == "polymarket:P4"
        assert result[0]["kalshi_id"] == "kalshi:K4"

    def test_ucl_ata_trailing_digit(self):
        poly = [_poly("P5", "ucl-ata1-bvb-2026-02-25")]
        kalshi = [_kalshi("K5", "KXUCLGAME-26FEB25ATABVB")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_laliga2_matches(self):
        poly = [_poly("P6", "es2-ceu-cor-2026-02-08")]
        kalshi = [_kalshi("K6", "KXLALIGA2GAME-26FEB08CEUCOR")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_nhl_matches(self):
        poly = [_poly("P7", "nhl-bos-tor-2026-02-25")]
        kalshi = [_kalshi("K7", "KXNHLGAME-26FEB25BOSTOR")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_epl_matches(self):
        poly = [_poly("P8", "epl-liv-mci-2026-03-01")]
        kalshi = [_kalshi("K8", "KXEPLGAME-26MAR01LIVMCI")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_cs2_matches(self):
        poly = [_poly("P9", "cs2-nrg-faz-2026-03-15")]
        kalshi = [_kalshi("K9", "KXCS2GAME-26MAR15NRGFAZ")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_bundesliga_matches(self):
        poly = [_poly("P10", "bun-bay-bvb-2026-03-08")]
        kalshi = [_kalshi("K10", "KXBUNDESLIGAGAME-26MAR08BAYBVB")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_multiple_games_batch_matching(self):
        poly = [
            _poly("P1", "nba-okc-det-2026-02-25"),
            _poly("P2", "nba-sac-hou-2026-02-25"),
            _poly("P3", "ucl-rma1-ben-2026-02-25"),
        ]
        kalshi = [
            _kalshi("K1", "KXNBAGAME-26FEB25OKCDET"),
            _kalshi("K2", "KXNBAGAME-26FEB25SACHOU"),
            _kalshi("K3", "KXUCLGAME-26FEB25RMABEN"),
        ]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 3

    def test_team_order_independent(self):
        # okc-det vs det-okc should both match the same kalshi market
        poly_fwd = [_poly("P1", "nba-okc-det-2026-02-25")]
        poly_rev = [_poly("P1", "nba-det-okc-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]

        result_fwd = match_sports_deterministic(poly_fwd, kalshi)
        result_rev = match_sports_deterministic(poly_rev, kalshi)
        assert len(result_fwd) == 1
        assert len(result_rev) == 1

    def test_non_moneyline_excluded(self):
        # Polymarket spreads market should not be matched
        poly = [_poly("P1", "nba-okc-det-2026-02-25", sports_market_type="spreads")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0

    def test_empty_sports_market_type_allowed(self):
        # Empty sports_market_type → treat as moneyline (default binary market)
        poly = [_poly("P1", "nba-okc-det-2026-02-25", sports_market_type="")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_parlay_kalshi_market_not_matched(self):
        # KXMVESPORTSMULTIGAME not in KALSHI_LEAGUE_MAP → no match
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXMVESPORTSMULTIGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0

    def test_no_match_different_dates(self):
        # Same teams, different dates → different canonical keys
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB26OKCDET")]  # Feb 26, not 25
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0

    def test_no_match_different_teams(self):
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25LACLAC")]  # different teams
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0

    def test_empty_lists(self):
        assert match_sports_deterministic([], []) == []
        assert match_sports_deterministic([_poly("P1", "nba-okc-det-2026-02-25")], []) == []
        assert match_sports_deterministic([], [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]) == []

    def test_non_sports_poly_slug_not_matched(self):
        # Non-sports slug (not in POLY_LEAGUE_MAP) → no match
        poly = [_poly("P1", "will-btc-hit-100k-2026-03-31")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0

    def test_confidence_is_1_0(self):
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert result[0]["confidence"] == 1.0

    def test_reasoning_contains_canonical_key(self):
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert "nba:det-okc:2026-02-25" in result[0]["reasoning"]


# ---------------------------------------------------------------------------
# League map coverage
# ---------------------------------------------------------------------------

class TestLeagueMaps:

    def test_poly_league_map_has_all_required_leagues(self):
        required = {"nba", "nhl", "ucl", "epl", "es2", "bun", "dota2", "lol", "cs2", "atp", "wta"}
        assert required.issubset(POLY_LEAGUE_MAP.keys())

    def test_kalshi_league_map_has_all_required_series(self):
        required = {
            "KXNBAGAME", "KXNHLGAME", "KXUCLGAME", "KXEPLGAME", "KXLALIGA2GAME",
            "KXBUNDESLIGAGAME", "KXDOTA2GAME", "KXLOLGAME", "KXCS2GAME",
            "KXATPGAME", "KXWTAGAME",
        }
        assert required.issubset(KALSHI_LEAGUE_MAP.keys())

    def test_parlay_series_not_in_kalshi_map(self):
        assert "KXMVESPORTSMULTIGAME" not in KALSHI_LEAGUE_MAP
