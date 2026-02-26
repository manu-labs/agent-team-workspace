"""Deterministic slug-based sports matcher (Pass 0).

Both Polymarket and Kalshi encode identical team abbreviations in their market
slugs/tickers, enabling O(1) exact matching without embeddings or LLM calls.

Polymarket slug format:  {league}-{team1}-{team2}-{YYYY-MM-DD}[-suffix]
Kalshi event_ticker:     KX{LEAGUE}GAME-{YY}{MMM}{DD}[{HHMM}]{TEAMS}
Kalshi market ticker:    {event_ticker}-{YES_TEAM}

  Where [HHMM] is an optional 4-digit 24-hour game start time (used by AHL,
  KHL, FIBA, ACB, and some other international series).  TEAMS is the
  concatenation of both team codes with NO delimiter — length varies from
  4 chars (2+2, e.g. "BCNY" for TGL golf) to 12+ chars (6+6 esports).

  The YES_TEAM suffix on the market ticker encodes which team YES resolves
  for (e.g. "KXWTAMATCH-26FEB25BARTOW-TOW" → YES = Townsend wins).

Matching approach:
  1. Parse Polymarket slug (always unambiguous — hyphen-separated) to get
     (league, team1, team2, date).
  2. Parse Kalshi ticker to get (league, teams_str, date), where teams_str
     is the raw unsplit concatenation of both team codes.
  3. Match by checking if teams_str == team1+team2 OR team2+team1
     (after TEAM_ALIASES resolution).
  4. For each matched game, run check_sports_orientation() to select only
     the ALIGNED Kalshi market (YES side matches team1). Inverted markets
     are skipped — no match created.
  5. Canonical key {league}:{team_a}-{team_b}:{YYYY-MM-DD} is used only
     for logging/reasoning (teams sorted for readability).
"""

import logging
import re
from datetime import date, datetime, timedelta

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# League maps
# ---------------------------------------------------------------------------

# Polymarket slug prefix → canonical league name
POLY_LEAGUE_MAP: dict[str, str] = {
    "nba": "nba",
    "nhl": "nhl",
    "ucl": "ucl",
    "epl": "epl",
    "es2": "laliga2",
    "bun": "bundesliga",
    "dota2": "dota2",
    "lol": "lol",
    "cs2": "cs2",
    "atp": "atp",
    "wta": "wta",
    "val": "valorant",
    "ncaamb": "ncaab",
}

# Kalshi series prefix → canonical league name
KALSHI_LEAGUE_MAP: dict[str, str] = {
    "KXNBAGAME": "nba",
    "KXNHLGAME": "nhl",
    "KXUCLGAME": "ucl",
    "KXEPLGAME": "epl",
    "KXLALIGA2GAME": "laliga2",
    "KXBUNDESLIGAGAME": "bundesliga",
    "KXDOTA2GAME": "dota2",
    "KXLOLGAME": "lol",
    "KXCS2GAME": "cs2",
    "KXATPGAME": "atp",
    "KXATPMATCH": "atp",      # alternative series name used for some ATP events
    "KXWTAGAME": "wta",
    "KXWTAMATCH": "wta",      # actual live series name (KXWTAGAME was incorrect in v1)
    "KXVALORANTGAME": "valorant",
    "KXNCAAMBGAME": "ncaab",
}

# ---------------------------------------------------------------------------
# Team aliases — cross-platform code mismatches
# ---------------------------------------------------------------------------

# Maps a Polymarket team code (lowercase) to the Kalshi team code (lowercase).
# Polymarket sometimes uses longer or different abbreviations.
TEAM_ALIASES: dict[str, str] = {
    "utah": "uta",   # NHL Utah Mammoth / NBA Utah Jazz
}

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Polymarket: {league}-{team1}-{team2}-{YYYY-MM-DD}[-anything]
# League: 2-10 alnum chars; team codes: 2-7 alphanumeric chars
# Using [a-z\d]{2,7} to handle codes like "c9" (Cloud9), "liquid", "okc", "rma1"
_POLY_SLUG_RE = re.compile(
    r"^([a-z0-9]+)-([a-z\d]{2,7})-([a-z\d]{2,7})-(\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)

# Strip trailing digit disambiguation suffixes from UCL team codes (rma1→rma, ata1→ata).
# Only strip when at least 2 chars remain so esports codes like "c9" are preserved
# (stripping the 9 would leave "c", which is a fragment, not a team code).
_TRAILING_DIGITS_RE = re.compile(r"\d+$")


def _strip_ucl_suffix(code: str) -> str:
    """Strip trailing digit only when ≥2 chars remain after stripping.

    UCL disambiguation: rma1→rma, ata1→ata (digit is a suffix)
    Esports codes:      c9→c9, t1→t1 (digit is part of the name, keep it)
    """
    stripped = _TRAILING_DIGITS_RE.sub("", code)
    return stripped if len(stripped) >= 2 else code

# Kalshi suffix: YYMMMDD + optional HHMM time code + team codes (2-12 alpha)
#   YY   = last 2 digits of year (26 → 2026)
#   MMM  = 3-letter month abbreviation (FEB, MAR, ...)
#   DD   = 2-digit day (25, 08, ...)
#   HHMM = optional 4-digit 24h game start time (1600, 0900, ...)
#   TEAMS = concatenated team codes, alpha only, 2-12 chars total
#
# Examples:
#   26FEB25OKCDET       → year=2026, FEB, day=25, teams="okcdet"   (3+3, NBA)
#   26FEB25VGKLA        → year=2026, FEB, day=25, teams="vgkla"    (3+2, NHL)
#   26FEB25LIQUIDPARI   → year=2026, FEB, day=25, teams="liquidpari" (6+4, Dota2)
#   26FEB281600CHITOR   → year=2026, FEB, day=28, time stripped, teams="chitor" (AHL)
_KALSHI_SUFFIX_RE = re.compile(
    r"^(\d{2})([A-Z]{3})(\d{2})(?:\d{4})?([A-Z]{2,12})$",
    re.IGNORECASE,
)

_MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}

# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------

def parse_poly_slug(slug: str) -> tuple[str, str, str, str] | None:
    """Parse a Polymarket event slug into (league, team1, team2, date_iso).

    Returns None if the slug is not a parseable sports game slug.

    Examples:
        "nba-okc-det-2026-02-25"     → ("nba", "okc", "det", "2026-02-25")
        "ucl-rma1-ben-2026-02-25"    → ("ucl", "rma", "ben", "2026-02-25")  # UCL suffix stripped
        "lol-c9-tlm-2026-03-01"      → ("lol", "c9", "tlm", "2026-03-01")   # esports digit kept
        "es2-ceu-cor-2026-02-08"     → ("laliga2", "ceu", "cor", "2026-02-08")
        "btc-usd-100000-2026-03-31"  → None  (not in POLY_LEAGUE_MAP)
        ""                           → None
    """
    if not slug:
        return None

    m = _POLY_SLUG_RE.match(slug.strip().lower())
    if not m:
        return None

    league_prefix, raw_t1, raw_t2, date_str = m.groups()

    league = POLY_LEAGUE_MAP.get(league_prefix)
    if not league:
        return None

    # Strip UCL disambiguation digit suffix (rma1→rma) while preserving
    # esports codes where the digit is part of the name (c9→c9, not c9→c)
    team1 = _strip_ucl_suffix(raw_t1)
    team2 = _strip_ucl_suffix(raw_t2)
    if not team1 or not team2:
        return None

    return (league, team1, team2, date_str)


def parse_kalshi_event_ticker(event_ticker: str) -> tuple[str, str, str] | None:
    """Parse a Kalshi event_ticker into (league, teams_str, date_iso).

    Returns (league, teams_str, date) where teams_str is the full lowercase
    concatenation of both team codes (unsplit). The caller should check both
    orderings (team1+team2 and team2+team1) when matching.

    Returns None if not a parseable sports game ticker.

    Examples:
        "KXNBAGAME-26FEB25OKCDET"       → ("nba", "okcdet", "2026-02-25")
        "KXUCLGAME-26FEB25RMABEN"       → ("ucl", "rmaben", "2026-02-25")
        "KXNHLGAME-26FEB25VGKLA"        → ("nhl", "vgkla", "2026-02-25")   # 3+2
        "KXDOTA2GAME-26FEB25LIQUIDPARI" → ("dota2", "liquidpari", "2026-02-25") # 6+4
        "KXNBAGAME-26FEB251930OKCDET"   → ("nba", "okcdet", "2026-02-25")   # time stripped
        "KXMVESPORTSMULTIGAME-..."      → None  (not in KALSHI_LEAGUE_MAP)
    """
    if not event_ticker or "-" not in event_ticker:
        return None

    series_prefix, suffix = event_ticker.split("-", 1)
    league = KALSHI_LEAGUE_MAP.get(series_prefix.upper())
    if not league:
        return None

    m = _KALSHI_SUFFIX_RE.match(suffix.upper())
    if not m:
        return None

    year_str, mon_str, day_str, teams_str = m.groups()
    month = _MONTH_MAP.get(mon_str)
    if not month:
        return None

    try:
        year = 2000 + int(year_str)
        day = int(day_str)
        datetime(year, month, day)  # validate
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
    except (ValueError, OverflowError):
        return None

    return (league, teams_str.lower(), date_str)


# ---------------------------------------------------------------------------
# Canonical key (for logging / reasoning display)
# ---------------------------------------------------------------------------

def canonical_sports_key(league: str, team1: str, team2: str, date: str) -> str:
    """Build a canonical key for display and reasoning strings.

    Teams are sorted alphabetically so the key is order-independent.

    Example: ("nba", "okc", "det", "2026-02-25") → "nba:det-okc:2026-02-25"
    """
    teams = sorted([team1.lower(), team2.lower()])
    return f"{league}:{teams[0]}-{teams[1]}:{date}"


# ---------------------------------------------------------------------------
# Orientation check (Part 1)
# ---------------------------------------------------------------------------

def _teams_match(suffix: str, poly_team: str) -> bool:
    """Bidirectional prefix match between a Kalshi YES suffix and a Poly team code.

    Handles:
    - Exact match:         "okc" vs "okc"     → True
    - Suffix truncated:    "tow" vs "townsen"  → True  (Kalshi truncated Townsend)
    - Poly truncated:      "bartunk" vs "bar"  → True  (Kalshi truncated Bartunkova)
    - Alias resolved:      "uta" vs "utah"     → True  (TEAM_ALIASES: utah→uta)
    - Esports digit:       "c9" vs "c9"        → True  (min 2 chars both, exact)
    - No match:            "tow" vs "bartunk"  → False
    - Too short (< 2):     "c" vs "col"        → False (ambiguous)
    """
    if not suffix or not poly_team:
        return False
    s = suffix.lower()
    p = TEAM_ALIASES.get(poly_team.lower(), poly_team.lower())
    if min(len(s), len(p)) < 2:
        return False
    return s.startswith(p) or p.startswith(s)


def check_sports_orientation(
    kalshi_market_id: str,
    poly_team1: str,
    poly_team2: str,
) -> str:
    """Determine if a Kalshi market's YES side aligns with the Poly market's YES side.

    Kalshi creates two markets per game (one per team), e.g.:
      KXWTAMATCH-26FEB25BARTOW-BAR  → YES = Bartunkova wins
      KXWTAMATCH-26FEB25BARTOW-TOW  → YES = Townsend wins

    Polymarket has one market per game where team1 = YES side.

    Args:
        kalshi_market_id: Full Kalshi market ID, e.g. "kalshi:KXWTAMATCH-26FEB25BARTOW-TOW"
        poly_team1: Poly slug team1 (YES side), e.g. "bartunk"
        poly_team2: Poly slug team2 (NO side), e.g. "tow"

    Returns:
        "aligned"  — Kalshi YES resolves for team1 (same as Poly YES). Keep this match.
        "inverted" — Kalshi YES resolves for team2 (opposite of Poly YES). Reject this match.
        "unknown"  — Cannot determine (non-sports, parse failure, ambiguous suffix).
    """
    if not kalshi_market_id or not kalshi_market_id.startswith("kalshi:"):
        return "unknown"

    full_ticker = kalshi_market_id[len("kalshi:"):]  # e.g. "KXWTAMATCH-26FEB25BARTOW-TOW"

    # Market ticker has format {event_ticker}-{YES_TEAM} — need at least 2 hyphens
    if full_ticker.count("-") < 2:
        return "unknown"

    # Split off YES team suffix (last segment)
    event_ticker, yes_suffix = full_ticker.rsplit("-", 1)

    # Verify the event_ticker portion is a parseable sports ticker
    if not parse_kalshi_event_ticker(event_ticker):
        return "unknown"

    yes_suffix = yes_suffix.lower()

    if _teams_match(yes_suffix, poly_team1):
        return "aligned"
    if _teams_match(yes_suffix, poly_team2):
        return "inverted"

    return "unknown"


# ---------------------------------------------------------------------------
# Deterministic matcher (Pass 0)
# ---------------------------------------------------------------------------

def match_sports_deterministic(
    poly_markets: list,
    kalshi_markets: list,
) -> list[dict]:
    """Match sports markets deterministically using slug/ticker parsing.

    Parses Polymarket event slugs (hyphen-separated, always unambiguous) and
    Kalshi event_tickers to match by team codes and date. Handles variable-
    length team codes (2-12 chars) and optional time prefixes.

    Matching strategy:
      1. Build a Kalshi lookup keyed by (league, date, teams_str_lower).
         Stores ALL market IDs per game (Kalshi has two per game: one per team).
      2. For each Polymarket moneyline market, resolve team aliases and check
         both orderings (team1+team2, team2+team1) against the Kalshi lookup.
      3. If no exact date match, try ±1 day fallback to handle timezone edge
         cases (late-night US games may land on different dates on Kalshi vs
         Polymarket due to UTC vs local time).
      4. Run check_sports_orientation() on each candidate Kalshi market.
         ALIGNED markets are kept. UNKNOWN markets are kept as fallback.
         INVERTED-only games are skipped entirely — no match created.

    Zero embeddings, zero LLM calls. Returns confidence=1.0 for all matches.
    Inverted matches are rejected (not returned) so no price swapping is needed.

    Args:
        poly_markets: List of NormalizedMarket or dicts from Polymarket
        kalshi_markets: List of NormalizedMarket or dicts from Kalshi

    Returns:
        List of {poly_id, kalshi_id, confidence, reasoning} dicts.
        Only ALIGNED or UNKNOWN markets are returned — INVERTED are skipped.
    """
    # Build Kalshi lookup: (league, date_str, teams_str) → [kalshi_id, ...]
    # Store ALL market IDs per game (two per game: one per team)
    kalshi_by_key: dict[tuple[str, str, str], list[str]] = {}
    kalshi_parseable = 0
    for m in kalshi_markets:
        if isinstance(m, dict):
            mid = m.get("id", "")
            event_ticker = m.get("event_ticker", "")
        else:
            mid = m.id
            event_ticker = getattr(m, "event_ticker", "")
        if not event_ticker:
            continue
        parsed = parse_kalshi_event_ticker(event_ticker)
        if parsed:
            league, teams_str, date_str = parsed
            key = (league, date_str, teams_str)
            kalshi_by_key.setdefault(key, []).append(mid)
            kalshi_parseable += 1

    matched: list[dict] = []
    poly_parseable = 0
    for m in poly_markets:
        if isinstance(m, dict):
            mid = m.get("id", "")
            event_slug = m.get("event_slug", "")
            sports_market_type = m.get("sports_market_type", "")
        else:
            mid = m.id
            event_slug = getattr(m, "event_slug", "")
            sports_market_type = getattr(m, "sports_market_type", "")

        # Only match moneyline (binary win/loss) markets
        if sports_market_type and sports_market_type != "moneyline":
            continue

        parsed = parse_poly_slug(event_slug)
        if not parsed:
            continue

        poly_parseable += 1
        league, team1, team2, date_str = parsed

        # Resolve team aliases (e.g. "utah" → "uta")
        t1 = TEAM_ALIASES.get(team1.lower(), team1.lower())
        t2 = TEAM_ALIASES.get(team2.lower(), team2.lower())

        # Try both team orderings — Poly and Kalshi may list teams differently
        kalshi_ids: list[str] = []
        for teams_str in (t1 + t2, t2 + t1):
            ids = kalshi_by_key.get((league, date_str, teams_str))
            if ids:
                kalshi_ids = ids
                break

        if not kalshi_ids:
            # ±1 day fallback — late-night US games may have different dates on
            # Kalshi (local time) vs Polymarket (UTC)
            try:
                game_date = date.fromisoformat(date_str)
                for delta in (-1, 1):
                    adj_date = (game_date + timedelta(days=delta)).isoformat()
                    for teams_str_fb in (t1 + t2, t2 + t1):
                        ids = kalshi_by_key.get((league, adj_date, teams_str_fb))
                        if ids:
                            kalshi_ids = ids
                            logger.info(
                                "Date tolerance fallback (%+d day): %s",
                                delta,
                                canonical_sports_key(league, team1, team2, date_str),
                            )
                            break
                    if kalshi_ids:
                        break
            except ValueError:
                pass

        if not kalshi_ids:
            continue

        # Select best Kalshi market via orientation check.
        # ALIGNED: YES sides match — use this market.
        # UNKNOWN: can't determine orientation — pass through as fallback.
        # INVERTED: YES sides are opposite — skip this game entirely (no match created).
        best_id: str | None = None
        unknown_candidate: str | None = None

        for kid in kalshi_ids:
            orientation = check_sports_orientation(kid, team1, team2)
            if orientation == "aligned":
                best_id = kid
                break  # prefer aligned, stop searching
            elif orientation == "unknown" and unknown_candidate is None:
                unknown_candidate = kid  # pass through — non-sports or ambiguous

        if best_id is None:
            if unknown_candidate:
                best_id = unknown_candidate
            else:
                # All markets are inverted — skip this game entirely
                key_str = canonical_sports_key(league, team1, team2, date_str)
                logger.info("Skipping inverted match: %s", key_str)
                continue

        key_str = canonical_sports_key(league, team1, team2, date_str)
        matched.append({
            "poly_id": mid,
            "kalshi_id": best_id,
            "confidence": 1.0,
            "reasoning": f"Deterministic slug match: {key_str}",
        })

    logger.info(
        "Sports slug Pass 0: %d poly parseable, %d kalshi parseable -> %d deterministic matches",
        poly_parseable,
        kalshi_parseable,
        len(matched),
    )
    return matched
