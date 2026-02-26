"""Tests for app/services/sports_matcher.py

Tests cover:
- parse_poly_slug: 12+ cases including UCL trailing digit, La Liga 2, edge cases,
  Valorant (val prefix), NCAAB (ncaamb prefix)
- parse_kalshi_event_ticker: 15+ cases — 3-tuple (league, teams_str, date),
  variable-length team codes, optional time prefix stripping, parlay filter,
  Valorant (KXVALORANTGAME), NCAAB (KXNCAAMBGAME)
- canonical_sports_key: order-independence, sorting
- match_sports_deterministic: 10+ known cross-platform pairs, moneyline filter,
  parlay filter, team alias resolution, both team orderings, variable-length teams,
  ±1 day date tolerance fallback for timezone edge cases
"""

import pytest

from app.services.sports_matcher import (
    KALSHI_LEAGUE_MAP,
    POLY_LEAGUE_MAP,
    TEAM_ALIASES,
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

    def test_valorant_val_prefix(self):
        # "val" → "valorant"
        assert parse_poly_slug("val-c9-sen-2026-03-01") == ("valorant", "c9", "sen", "2026-03-01")

    def test_ncaab_ncaamb_prefix(self):
        # "ncaamb" → "ncaab"
        assert parse_poly_slug("ncaamb-duk-unc-2026-03-08") == ("ncaab", "duk", "unc", "2026-03-08")

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
# NOTE: Returns (league, teams_str, date) — teams_str is the FULL concatenation
# of both team codes (lowercase, unsplit). Caller handles the split.

class TestParseKalshiEventTicker:

    # --- Standard 3+3 team codes ---

    def test_nba_basic_returns_3_tuple(self):
        # Returns (league, teams_str, date) — teams are NOT split
        result = parse_kalshi_event_ticker("KXNBAGAME-26FEB25OKCDET")
        assert result == ("nba", "okcdet", "2026-02-25")

    def test_nba_different_game(self):
        assert parse_kalshi_event_ticker("KXNBAGAME-26FEB25SACHOU") == ("nba", "sachou", "2026-02-25")

    def test_nba_third_game(self):
        assert parse_kalshi_event_ticker("KXNBAGAME-26FEB25GSWMEM") == ("nba", "gswmem", "2026-02-25")

    def test_ucl(self):
        assert parse_kalshi_event_ticker("KXUCLGAME-26FEB25RMABEN") == ("ucl", "rmaben", "2026-02-25")

    def test_ucl_second_game(self):
        assert parse_kalshi_event_ticker("KXUCLGAME-26FEB25ATABVB") == ("ucl", "atabvb", "2026-02-25")

    def test_laliga2(self):
        assert parse_kalshi_event_ticker("KXLALIGA2GAME-26FEB08CEUCOR") == ("laliga2", "ceucor", "2026-02-08")

    def test_epl(self):
        assert parse_kalshi_event_ticker("KXEPLGAME-26MAR05TOTCRY") == ("epl", "totcry", "2026-03-05")

    def test_cs2(self):
        assert parse_kalshi_event_ticker("KXCS2GAME-26MAR15NRGFAZ") == ("cs2", "nrgfaz", "2026-03-15")

    def test_valorant(self):
        # KXVALORANTGAME → "valorant"
        assert parse_kalshi_event_ticker("KXVALORANTGAME-26MAR01C9SEN") == ("valorant", "c9sen", "2026-03-01")

    def test_ncaab(self):
        # KXNCAAMBGAME → "ncaab"
        assert parse_kalshi_event_ticker("KXNCAAMBGAME-26MAR08DUKUNC") == ("ncaab", "dukunc", "2026-03-08")

    # --- Variable-length team codes ---

    def test_nhl_short_3_plus_2(self):
        # VGK(3) + LA(2) = 5 chars total
        assert parse_kalshi_event_ticker("KXNHLGAME-26FEB25VGKLA") == ("nhl", "vgkla", "2026-02-25")

    def test_nhl_short_3_plus_2_different(self):
        # TOR(3) + TB(2) = TORTB, 5 chars
        assert parse_kalshi_event_ticker("KXNHLGAME-26FEB25TORTB") == ("nhl", "tortb", "2026-02-25")

    def test_dota2_long_esports(self):
        # LIQUID(6) + PARI(4) = LIQUIDPARI, 10 chars
        assert parse_kalshi_event_ticker("KXDOTA2GAME-26FEB25LIQUIDPARI") == ("dota2", "liquidpari", "2026-02-25")

    def test_dota2_medium_esports(self):
        # TUNDRA(6) + FLC(3) = TUNDRAFLC, 9 chars
        assert parse_kalshi_event_ticker("KXDOTA2GAME-26FEB25TUNDRAFLC") == ("dota2", "tundraflc", "2026-02-25")

    # --- Optional time prefix (HHMM) ---

    def test_time_prefix_stripped_hypothetical_nba(self):
        # If an NBA ticker had a time prefix, it should be stripped
        # "26FEB251930OKCDET" → strip 1930 → teams = "okcdet"
        result = parse_kalshi_event_ticker("KXNBAGAME-26FEB251930OKCDET")
        assert result == ("nba", "okcdet", "2026-02-25")

    def test_time_prefix_early_morning(self):
        # 0900 prefix
        result = parse_kalshi_event_ticker("KXNHLGAME-26FEB280900VGKLA")
        assert result == ("nhl", "vgkla", "2026-02-28")

    def test_time_prefix_afternoon(self):
        # 1600 prefix
        result = parse_kalshi_event_ticker("KXNHLGAME-26FEB281600TORTB")
        assert result == ("nhl", "tortb", "2026-02-28")

    # --- Date format is YY-MMM-DD (year-first) ---

    def test_date_yymmmdd_format_is_year_first(self):
        # "26FEB25" → year=2026, month=FEB, day=25 (NOT day=26, year=2025)
        result = parse_kalshi_event_ticker("KXNBAGAME-26FEB25OKCDET")
        assert result is not None
        _, _, date_str = result
        assert date_str == "2026-02-25"  # NOT "2025-02-26"

    # --- Filtering ---

    def test_parlay_not_in_league_map(self):
        # KXMVESPORTSMULTIGAME not in KALSHI_LEAGUE_MAP → returns None
        assert parse_kalshi_event_ticker("KXMVESPORTSMULTIGAME-26FEB25OKCDET") is None

    def test_empty_string_returns_none(self):
        assert parse_kalshi_event_ticker("") is None

    def test_no_dash_returns_none(self):
        assert parse_kalshi_event_ticker("KXNBAGAME26FEB25OKCDET") is None

    def test_unknown_series_returns_none(self):
        assert parse_kalshi_event_ticker("KXUNKNOWN-26FEB25OKCDET") is None

    def test_invalid_suffix_format_returns_none(self):
        assert parse_kalshi_event_ticker("KXNBAGAME-INVALIDFORMAT") is None

    def test_lowercase_handled(self):
        # series_prefix is uppercased internally
        assert parse_kalshi_event_ticker("kxnbagame-26FEB25OKCDET") == ("nba", "okcdet", "2026-02-25")


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

    # --- Known cross-platform pairs (NBA — 3+3) ---

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

    def test_nba_gsw_mem_matches(self):
        poly = [_poly("P3", "nba-gsw-mem-2026-02-25")]
        kalshi = [_kalshi("K3", "KXNBAGAME-26FEB25GSWMEM")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- UCL with trailing digit stripping ---

    def test_ucl_rma_trailing_digit(self):
        poly = [_poly("P4", "ucl-rma1-ben-2026-02-25")]
        kalshi = [_kalshi("K4", "KXUCLGAME-26FEB25RMABEN")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1, "UCL trailing digit (rma1→rma) should match"

    def test_ucl_ata_trailing_digit(self):
        poly = [_poly("P5", "ucl-ata1-bvb-2026-02-25")]
        kalshi = [_kalshi("K5", "KXUCLGAME-26FEB25ATABVB")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- La Liga 2 ---

    def test_laliga2_matches(self):
        poly = [_poly("P6", "es2-ceu-cor-2026-02-08")]
        kalshi = [_kalshi("K6", "KXLALIGA2GAME-26FEB08CEUCOR")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- NHL with 2-char team codes ---

    def test_nhl_3_plus_2_matches(self):
        # Poly "vgk" + "la" = "vgkla" → matches KXNHLGAME suffix "VGKLA"
        poly = [_poly("P7", "nhl-vgk-la-2026-02-25")]
        kalshi = [_kalshi("K7", "KXNHLGAME-26FEB25VGKLA")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_nhl_tor_tb_matches(self):
        poly = [_poly("P8", "nhl-tor-tb-2026-02-25")]
        kalshi = [_kalshi("K8", "KXNHLGAME-26FEB25TORTB")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- EPL ---

    def test_epl_matches(self):
        poly = [_poly("P9", "epl-liv-mci-2026-03-01")]
        kalshi = [_kalshi("K9", "KXEPLGAME-26MAR01LIVMCI")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- Esports with long/variable team codes ---

    def test_dota2_long_teams_matches(self):
        # "liquid" (6) + "pari" (4) = "liquidpari" → Poly slug "dota2-liquid-pari-..."
        poly = [_poly("P10", "dota2-liquid-pari-2026-02-25")]
        kalshi = [_kalshi("K10", "KXDOTA2GAME-26FEB25LIQUIDPARI")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_cs2_matches(self):
        poly = [_poly("P11", "cs2-nrg-faz-2026-03-15")]
        kalshi = [_kalshi("K11", "KXCS2GAME-26MAR15NRGFAZ")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- Bundesliga ---

    def test_bundesliga_matches(self):
        poly = [_poly("P12", "bun-bay-bvb-2026-03-08")]
        kalshi = [_kalshi("K12", "KXBUNDESLIGAGAME-26MAR08BAYBVB")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- Valorant (new — issue #308) ---

    def test_valorant_matches(self):
        poly = [_poly("P20", "val-c9-sen-2026-03-01")]
        kalshi = [_kalshi("K20", "KXVALORANTGAME-26MAR01C9SEN")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- NCAAB (new — issue #308) ---

    def test_ncaab_matches(self):
        poly = [_poly("P21", "ncaamb-duk-unc-2026-03-08")]
        kalshi = [_kalshi("K21", "KXNCAAMBGAME-26MAR08DUKUNC")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- Team alias resolution ---

    def test_team_alias_utah_to_uta(self):
        # Polymarket "utah" → alias resolves to "uta" → matches Kalshi "uta"
        poly = [_poly("P13", "nhl-utah-col-2026-02-25")]
        kalshi = [_kalshi("K13", "KXNHLGAME-26FEB25UTACOL")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- Team order independence ---

    def test_team_order_independent_fwd(self):
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    def test_team_order_independent_rev(self):
        # Poly lists teams reversed vs Kalshi ticker
        poly = [_poly("P1", "nba-det-okc-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1

    # --- ±1 day date tolerance (new — issue #309) ---

    def test_date_tolerance_plus_one_day(self):
        # Poly lists game on Feb 25 (UTC), Kalshi lists it on Feb 26 (local time)
        poly = [_poly("P30", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K30", "KXNBAGAME-26FEB26OKCDET")]  # Feb 26
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1, "Should match via +1 day fallback"
        assert result[0]["poly_id"] == "polymarket:P30"
        assert result[0]["kalshi_id"] == "kalshi:K30"

    def test_date_tolerance_minus_one_day(self):
        # Poly lists game on Feb 26 (UTC), Kalshi lists it on Feb 25 (local time)
        poly = [_poly("P31", "nba-okc-det-2026-02-26")]
        kalshi = [_kalshi("K31", "KXNBAGAME-26FEB25OKCDET")]  # Feb 25
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1, "Should match via -1 day fallback"
        assert result[0]["poly_id"] == "polymarket:P31"
        assert result[0]["kalshi_id"] == "kalshi:K31"

    def test_date_tolerance_exact_preferred_over_fallback(self):
        # Exact match should be used; the ±1 fallback market should NOT be picked
        poly = [_poly("P32", "nba-okc-det-2026-02-25")]
        kalshi = [
            _kalshi("K_exact", "KXNBAGAME-26FEB25OKCDET"),   # exact
            _kalshi("K_plus1", "KXNBAGAME-26FEB26OKCDET"),   # +1 day
        ]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 1
        assert result[0]["kalshi_id"] == "kalshi:K_exact"

    def test_date_tolerance_two_days_no_match(self):
        # ±2 days is outside the tolerance window — should NOT match
        poly = [_poly("P33", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K33", "KXNBAGAME-26FEB27OKCDET")]  # Feb 27 = +2 days
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0, "±2 day gap should not match"

    # --- Batch matching ---

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

    # --- Filters ---

    def test_non_moneyline_excluded(self):
        poly = [_poly("P1", "nba-okc-det-2026-02-25", sports_market_type="spreads")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0

    def test_empty_sports_market_type_allowed(self):
        # Empty sports_market_type → treat as binary moneyline
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
        # Two days apart — outside ±1 tolerance
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB27OKCDET")]  # Feb 27, +2 days
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0

    def test_no_match_different_teams(self):
        poly = [_poly("P1", "nba-okc-det-2026-02-25")]
        kalshi = [_kalshi("K1", "KXNBAGAME-26FEB25SACMEM")]  # different teams
        result = match_sports_deterministic(poly, kalshi)
        assert len(result) == 0

    def test_empty_lists(self):
        assert match_sports_deterministic([], []) == []
        assert match_sports_deterministic([_poly("P1", "nba-okc-det-2026-02-25")], []) == []
        assert match_sports_deterministic([], [_kalshi("K1", "KXNBAGAME-26FEB25OKCDET")]) == []

    def test_non_sports_poly_slug_not_matched(self):
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
        required = {
            "nba", "nhl", "ucl", "epl", "es2", "bun", "dota2", "lol", "cs2",
            "atp", "wta", "val", "ncaamb",
        }
        assert required.issubset(POLY_LEAGUE_MAP.keys())

    def test_kalshi_league_map_has_all_required_series(self):
        required = {
            "KXNBAGAME", "KXNHLGAME", "KXUCLGAME", "KXEPLGAME", "KXLALIGA2GAME",
            "KXBUNDESLIGAGAME", "KXDOTA2GAME", "KXLOLGAME", "KXCS2GAME",
            "KXATPGAME", "KXWTAGAME", "KXVALORANTGAME", "KXNCAAMBGAME",
        }
        assert required.issubset(KALSHI_LEAGUE_MAP.keys())

    def test_parlay_series_not_in_kalshi_map(self):
        assert "KXMVESPORTSMULTIGAME" not in KALSHI_LEAGUE_MAP

    def test_team_aliases_utah_to_uta(self):
        assert TEAM_ALIASES.get("utah") == "uta"
