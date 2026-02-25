"""Sports matching recall test suite — issue #292.

Tests that match_sports_deterministic achieves ≥90% recall against 20 verified
cross-platform Polymarket↔Kalshi sports pairs, with 0% false positives on 10
negative examples.

Fixture data sourced from Bob's #289/#292 analysis of live Kalshi API data.

Coverage:
  Positive pairs (20): NBA×3, NHL×5, UCL×2, EPL×1, La Liga 2×2, Bundesliga×1,
                       Dota2×3, LoL×1, CS2×1, WTA×1
  Negative examples (10): date mismatch, team mismatch, cross-league, parlay filter,
                          non-sports slug, non-moneyline, unsupported series

Per-league recall target: ≥90% (each league with ≥2 pairs enforced individually).

Known gap: ATP (KXATPGAME) has no active open events in current Kalshi data —
not included in fixtures. Will be added once live pairs are confirmed.
"""

import pytest

from app.services.sports_matcher import match_sports_deterministic


# ---------------------------------------------------------------------------
# Fixture data
# ---------------------------------------------------------------------------

# Each entry: (poly_event_slug, kalshi_event_ticker, league, description)
# All pairs sourced from live Kalshi API data per Bob's #289/#292 analysis.
# Poly slugs derived from the same 3-letter team codes present in Kalshi tickers.

POSITIVE_PAIRS: list[tuple[str, str, str, str]] = [
    # --- NBA (3+3 team codes) ---
    ("nba-okc-det-2026-02-25", "KXNBAGAME-26FEB25OKCDET", "nba",
     "OKC at Detroit — standard 3+3"),
    ("nba-gsw-mem-2026-02-25", "KXNBAGAME-26FEB25GSWMEM", "nba",
     "Golden State at Memphis — standard 3+3"),
    ("nba-sac-hou-2026-02-25", "KXNBAGAME-26FEB25SACHOU", "nba",
     "Sacramento at Houston — standard 3+3"),

    # --- NHL (variable-length codes: 3+2 with 2-char teams LA, TB, NJ, SJ) ---
    ("nhl-col-utah-2026-02-25", "KXNHLGAME-26FEB25COLUTA", "nhl",
     "Colorado at Utah — TEAM_ALIAS: utah→uta"),
    ("nhl-edm-la-2026-02-26",  "KXNHLGAME-26FEB26EDMLA",  "nhl",
     "Edmonton at Los Angeles — 3+2, LA is 2-char Kalshi code"),
    ("nhl-tor-tb-2026-02-25",  "KXNHLGAME-26FEB25TORTB",  "nhl",
     "Toronto at Tampa Bay — 3+2, TB is 2-char Kalshi code"),
    ("nhl-buf-nj-2026-02-25",  "KXNHLGAME-26FEB25BUFNJ",  "nhl",
     "Buffalo at New Jersey — 3+2, NJ is 2-char Kalshi code"),
    ("nhl-cgy-sj-2026-02-26",  "KXNHLGAME-26FEB26CGYSJ",  "nhl",
     "Calgary at San Jose — 3+2, SJ is 2-char Kalshi code"),

    # --- UCL (trailing digit stripping: rma1→rma, ata1→ata) ---
    ("ucl-rma1-ben-2026-02-25", "KXUCLGAME-26FEB25RMABEN", "ucl",
     "Real Madrid vs Benfica — UCL slug has trailing digit suffix"),
    ("ucl-ata1-bvb-2026-02-25", "KXUCLGAME-26FEB25ATABVB", "ucl",
     "Atalanta vs Dortmund — UCL slug has trailing digit suffix"),

    # --- EPL ---
    ("epl-tot-cry-2026-03-05", "KXEPLGAME-26MAR05TOTCRY", "epl",
     "Tottenham vs Crystal Palace — standard 3+3"),

    # --- La Liga 2 (Poly prefix es2 → kalshi KXLALIGA2GAME) ---
    ("es2-cas-san-2026-02-28", "KXLALIGA2GAME-26FEB28CASSAN", "laliga2",
     "Castellon vs Santander — standard 3+3"),
    ("es2-ceu-cor-2026-02-08", "KXLALIGA2GAME-26FEB08CEUCOR", "laliga2",
     "Ceuta vs Cordoba — standard 3+3"),

    # --- Bundesliga ---
    ("bun-hsv-lev-2026-03-04", "KXBUNDESLIGAGAME-26MAR04HSVLEV", "bundesliga",
     "Hamburg vs Leverkusen — standard 3+3"),

    # --- Dota2 (variable-length esports team codes) ---
    ("dota2-liquid-pari-2026-02-25", "KXDOTA2GAME-26FEB25LIQUIDPARI", "dota2",
     "Team Liquid vs PARIVISION — 6+4 esports codes"),
    ("dota2-tundra-flc-2026-02-25",  "KXDOTA2GAME-26FEB25TUNDRAFLC",  "dota2",
     "Tundra vs Team Falcons — 6+3 esports codes"),
    ("dota2-bb-aur-2026-02-25",      "KXDOTA2GAME-26FEB25BBAUR",      "dota2",
     "BetBoom vs Aurora — 2+3 esports codes"),

    # --- League of Legends ---
    ("lol-fur-red-2026-02-28", "KXLOLGAME-26FEB28FURRED", "lol",
     "FURIA vs RED Canids — FUR+RED = FURRED"),

    # --- CS2 (variable-length: 2+5) ---
    ("cs2-ww-unity-2026-02-27", "KXCS2GAME-26FEB27WWUNITY", "cs2",
     "WW Team vs UNiTY — 2+5 esports codes"),

    # --- WTA (requires KXWTAMATCH in KALSHI_LEAGUE_MAP — v1 had KXWTAGAME only) ---
    ("wta-zak-kru-2026-02-26", "KXWTAMATCH-26FEB26ZAKKRU", "wta",
     "Zakharova vs Krueger — KXWTAMATCH is the live Kalshi series name"),
]

# Negative examples: each entry is (poly_slug, kalshi_ticker, reason).
# These pairs should NOT be matched — any match is a false positive.
NEGATIVE_EXAMPLES: list[tuple[str, str, str, str, str]] = [
    # (poly_slug, sports_market_type, kalshi_ticker, reason_code, description)
    ("nba-okc-det-2026-02-26", "moneyline", "KXNBAGAME-26FEB25OKCDET",
     "date_mismatch", "Same teams, different date (Feb 26 vs Feb 25)"),
    ("nba-lac-den-2026-02-25", "moneyline", "KXNBAGAME-26FEB25OKCDET",
     "team_mismatch", "Different teams (LAC+DEN vs OKC+DET)"),
    ("nhl-okc-det-2026-02-25", "moneyline", "KXNBAGAME-26FEB25OKCDET",
     "league_mismatch", "NHL slug vs NBA ticker — different canonical leagues"),
    ("nba-okc-det-2026-02-25", "moneyline", "KXMVESPORTSMULTIGAME-26FEB25OKCDET",
     "parlay_filter", "Kalshi multi-game parlay — not in KALSHI_LEAGUE_MAP"),
    ("will-btc-100k-2026-03-31", "moneyline", "KXNBAGAME-26FEB25OKCDET",
     "non_sports_slug", "Crypto prediction slug — not in POLY_LEAGUE_MAP"),
    ("nba-okc-det-2026-02-25", "spreads", "KXNBAGAME-26FEB25OKCDET",
     "non_moneyline", "Polymarket spreads market filtered out"),
    ("nhl-tor-tb-2026-02-26", "moneyline", "KXNHLGAME-26FEB25TORTB",
     "date_mismatch_nhl", "NHL — same teams, wrong date (Feb 26 vs Feb 25)"),
    ("ucl-mci-ars-2026-02-25", "moneyline", "KXUCLGAME-26FEB25RMABEN",
     "team_mismatch_ucl", "UCL — wrong teams for this fixture"),
    ("epl-tot-cry-2026-03-05", "moneyline", "KXLALIGAGAME-26MAR05TOTCRY",
     "wrong_series", "EPL slug vs KXLALIGAGAME (La Liga 1) — unsupported series"),
    ("nba-okc-det-2026-02-25", "moneyline", "KXAHLGAME-26FEB281600CHITOR",
     "unsupported_league", "AHL not in KALSHI_LEAGUE_MAP — time-prefixed ticker ignored"),
]


# ---------------------------------------------------------------------------
# Helpers
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


# ---------------------------------------------------------------------------
# Individual pair tests (parametrized — each pair is a separate test case)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "poly_slug,kalshi_ticker,league,description",
    POSITIVE_PAIRS,
    ids=[f"{league}:{desc.split(' — ')[0]}" for _, _, league, desc in POSITIVE_PAIRS],
)
def test_each_positive_pair_matches(poly_slug, kalshi_ticker, league, description):
    """Every known positive pair must be matched deterministically."""
    poly = [_poly("P", poly_slug)]
    kalshi = [_kalshi("K", kalshi_ticker)]
    result = match_sports_deterministic(poly, kalshi)
    assert len(result) == 1, (
        f"Expected match for {description}\n"
        f"  Poly slug:      {poly_slug}\n"
        f"  Kalshi ticker:  {kalshi_ticker}\n"
        f"  Got {len(result)} matches instead of 1"
    )
    assert result[0]["confidence"] == 1.0


# ---------------------------------------------------------------------------
# Batch recall test (all pairs in one call — simulates real usage)
# ---------------------------------------------------------------------------

class TestBatchRecall:

    def _run_batch(self):
        """Run all positive pairs through the matcher in a single batch call."""
        poly_markets = [
            _poly(f"poly_{i}", slug)
            for i, (slug, _, _, _) in enumerate(POSITIVE_PAIRS)
        ]
        kalshi_markets = [
            _kalshi(f"kalshi_{i}", ticker)
            for i, (_, ticker, _, _) in enumerate(POSITIVE_PAIRS)
        ]
        return match_sports_deterministic(poly_markets, kalshi_markets)

    def test_overall_recall_at_least_90_percent(self):
        result = self._run_batch()

        matched_poly_ids = {r["poly_id"] for r in result}
        matched = sum(
            1 for i in range(len(POSITIVE_PAIRS))
            if f"polymarket:poly_{i}" in matched_poly_ids
        )
        total = len(POSITIVE_PAIRS)
        recall = matched / total

        # Print per-pair status for debugging (visible with pytest -s or on failure)
        unmatched = [
            f"  [{league}] {desc}: {slug} ↔ {ticker}"
            for i, (slug, ticker, league, desc) in enumerate(POSITIVE_PAIRS)
            if f"polymarket:poly_{i}" not in matched_poly_ids
        ]
        if unmatched:
            msg = "\nUnmatched pairs:\n" + "\n".join(unmatched)
        else:
            msg = ""

        assert recall >= 0.90, (
            f"Recall {recall:.1%} ({matched}/{total}) is below the 90% target.{msg}"
        )

    def test_no_false_positives_in_batch(self):
        """The matcher must not invent pairs that don't exist in the fixture set."""
        result = self._run_batch()

        # Build the set of expected (poly_id, kalshi_id) pairs
        expected_pairs = {
            (f"polymarket:poly_{i}", f"kalshi:kalshi_{i}")
            for i in range(len(POSITIVE_PAIRS))
        }
        for r in result:
            pair = (r["poly_id"], r["kalshi_id"])
            assert pair in expected_pairs, (
                f"False positive: {r['poly_id']} matched {r['kalshi_id']} "
                f"but this pair is not in the fixture set.\n"
                f"Reasoning: {r.get('reasoning', '')}"
            )

    def test_no_cross_league_matching(self):
        """Markets from different leagues must not match each other."""
        # Put NBA markets against UCL tickers and vice versa
        poly_markets = [_poly("nba_poly", "nba-okc-det-2026-02-25")]
        kalshi_markets = [_kalshi("ucl_kalshi", "KXUCLGAME-26FEB25RMABEN")]
        result = match_sports_deterministic(poly_markets, kalshi_markets)
        assert len(result) == 0, "NBA poly market should not match UCL kalshi ticker"


# ---------------------------------------------------------------------------
# Per-league recall breakdown
# ---------------------------------------------------------------------------

class TestPerLeagueRecall:

    def _recall_for_league(self, target_league: str) -> tuple[int, int]:
        """Returns (matched, total) for the given league."""
        league_pairs = [
            (i, slug, ticker)
            for i, (slug, ticker, league, _) in enumerate(POSITIVE_PAIRS)
            if league == target_league
        ]
        if not league_pairs:
            return 0, 0

        poly_markets = [_poly(f"poly_{i}", slug) for i, slug, _ in league_pairs]
        kalshi_markets = [_kalshi(f"kalshi_{i}", ticker) for i, _, ticker in league_pairs]
        result = match_sports_deterministic(poly_markets, kalshi_markets)

        matched_poly_ids = {r["poly_id"] for r in result}
        matched = sum(
            1 for i, _, _ in league_pairs
            if f"polymarket:poly_{i}" in matched_poly_ids
        )
        return matched, len(league_pairs)

    def test_nba_recall(self):
        matched, total = self._recall_for_league("nba")
        assert total >= 2, "Need at least 2 NBA fixtures"
        assert matched == total, f"NBA recall {matched}/{total} — expected all to match"

    def test_nhl_recall(self):
        matched, total = self._recall_for_league("nhl")
        assert total >= 2, "Need at least 2 NHL fixtures"
        recall = matched / total
        assert recall >= 0.90, f"NHL recall {recall:.1%} ({matched}/{total}) below 90%"

    def test_ucl_recall(self):
        matched, total = self._recall_for_league("ucl")
        assert total >= 2, "Need at least 2 UCL fixtures"
        assert matched == total, f"UCL recall {matched}/{total} — expected all to match"

    def test_epl_recall(self):
        matched, total = self._recall_for_league("epl")
        assert total >= 1
        assert matched == total, f"EPL recall {matched}/{total}"

    def test_laliga2_recall(self):
        matched, total = self._recall_for_league("laliga2")
        assert total >= 2, "Need at least 2 La Liga 2 fixtures"
        assert matched == total, f"La Liga 2 recall {matched}/{total}"

    def test_bundesliga_recall(self):
        matched, total = self._recall_for_league("bundesliga")
        assert total >= 1
        assert matched == total, f"Bundesliga recall {matched}/{total}"

    def test_dota2_recall(self):
        matched, total = self._recall_for_league("dota2")
        assert total >= 2, "Need at least 2 Dota2 fixtures"
        assert matched == total, f"Dota2 recall {matched}/{total} (esports variable-length codes)"

    def test_lol_recall(self):
        matched, total = self._recall_for_league("lol")
        assert total >= 1
        assert matched == total, f"LoL recall {matched}/{total}"

    def test_cs2_recall(self):
        matched, total = self._recall_for_league("cs2")
        assert total >= 1
        assert matched == total, f"CS2 recall {matched}/{total}"

    def test_wta_recall(self):
        matched, total = self._recall_for_league("wta")
        assert total >= 1
        assert matched == total, (
            f"WTA recall {matched}/{total} — requires KXWTAMATCH in KALSHI_LEAGUE_MAP "
            f"(live Kalshi uses KXWTAMATCH, not KXWTAGAME)"
        )


# ---------------------------------------------------------------------------
# Negative pair tests — no false positives
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "poly_slug,sports_market_type,kalshi_ticker,reason_code,description",
    NEGATIVE_EXAMPLES,
    ids=[reason for _, _, _, reason, _ in NEGATIVE_EXAMPLES],
)
def test_negative_pair_not_matched(
    poly_slug, sports_market_type, kalshi_ticker, reason_code, description
):
    """Negative examples must never produce a match."""
    poly = [_poly("P", poly_slug, sports_market_type=sports_market_type)]
    kalshi = [_kalshi("K", kalshi_ticker)]
    result = match_sports_deterministic(poly, kalshi)
    assert len(result) == 0, (
        f"False positive for '{description}'\n"
        f"  Poly:   {poly_slug} (type={sports_market_type})\n"
        f"  Kalshi: {kalshi_ticker}\n"
        f"  Match:  {result}"
    )
