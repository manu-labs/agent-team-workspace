"""Deterministic slug-based sports matcher (Pass 0).

Both Polymarket and Kalshi encode identical 3-letter team abbreviations in
their market slugs/tickers, enabling O(1) exact matching without embeddings
or LLM calls.

Polymarket slug format:  {league}-{team1}-{team2}-{YYYY-MM-DD}[-suffix]
Kalshi event_ticker:     KX{LEAGUE}GAME-{YY}{MMM}{DD}{TEAM1}{TEAM2}

Canonical key: {league}:{team_a}-{team_b}:{YYYY-MM-DD}  (teams sorted)
"""

import logging
import re
from datetime import datetime

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
    "KXWTAGAME": "wta",
}

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Polymarket: {league}-{team1}-{team2}-{YYYY-MM-DD}[-anything]
# League: 2-10 alnum chars; team codes: 2-6 alpha chars, optional trailing digit
_POLY_SLUG_RE = re.compile(
    r"^([a-z0-9]+)-([a-z]{2,6}\d?)-([a-z]{2,6}\d?)-(\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)

# Strip trailing digit(s) from team codes (rma1 → rma, ata1 → ata)
_TRAILING_DIGITS_RE = re.compile(r"\d+$")

# Kalshi suffix: YYMMMDD + 6 uppercase alpha chars (two 3-char team codes)
# e.g. 26FEB25OKCDET → year=2026, month=FEB, day=25, teams=OKC+DET
_KALSHI_SUFFIX_RE = re.compile(r"^(\d{2})([A-Z]{3})(\d{2})([A-Z]{6})$")

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
        "ucl-rma1-ben-2026-02-25"    → ("ucl", "rma", "ben", "2026-02-25")
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

    # Strip trailing digits: rma1 → rma, ata1 → ata
    team1 = _TRAILING_DIGITS_RE.sub("", raw_t1)
    team2 = _TRAILING_DIGITS_RE.sub("", raw_t2)
    if not team1 or not team2:
        return None

    return (league, team1, team2, date_str)


def parse_kalshi_event_ticker(event_ticker: str) -> tuple[str, str, str, str] | None:
    """Parse a Kalshi event_ticker into (league, team1, team2, date_iso).

    Returns None if not a parseable sports game ticker.

    Examples:
        "KXNBAGAME-26FEB25OKCDET"      → ("nba", "okc", "det", "2026-02-25")
        "KXUCLGAME-26FEB25RMABEN"      → ("ucl", "rma", "ben", "2026-02-25")
        "KXLALIGA2GAME-26FEB25CEUCOR"  → ("laliga2", "ceu", "cor", "2026-02-25")
        "KXMVESPORTSMULTIGAME-..."     → None  (parlay — filtered separately)
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

    team1 = teams_str[:3].lower()
    team2 = teams_str[3:].lower()
    return (league, team1, team2, date_str)


# ---------------------------------------------------------------------------
# Canonical key
# ---------------------------------------------------------------------------

def canonical_sports_key(league: str, team1: str, team2: str, date: str) -> str:
    """Build a canonical key for deterministic cross-platform matching.

    Teams are sorted alphabetically so the key is order-independent.

    Example: ("nba", "okc", "det", "2026-02-25") → "nba:det-okc:2026-02-25"
    """
    teams = sorted([team1.lower(), team2.lower()])
    return f"{league}:{teams[0]}-{teams[1]}:{date}"


# ---------------------------------------------------------------------------
# Deterministic matcher
# ---------------------------------------------------------------------------

def match_sports_deterministic(
    poly_markets: list,
    kalshi_markets: list,
) -> list[dict]:
    """Match sports markets deterministically using slug/ticker parsing.

    Parses Polymarket event slugs and Kalshi event_tickers into canonical keys
    (league:teamA-teamB:YYYY-MM-DD) and matches by equality. Restricts
    Polymarket side to moneyline markets (binary win/loss).

    Zero embeddings, zero LLM calls. Returns confidence=1.0 for all matches.

    Args:
        poly_markets: List of NormalizedMarket or dicts from Polymarket
        kalshi_markets: List of NormalizedMarket or dicts from Kalshi

    Returns:
        List of {poly_id, kalshi_id, confidence, reasoning} dicts
    """
    # Build canonical key → kalshi_id index
    kalshi_by_key: dict[str, str] = {}
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
            key = canonical_sports_key(*parsed)
            if key not in kalshi_by_key:
                kalshi_by_key[key] = mid

    matched: list[dict] = []
    poly_parsed = 0
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

        poly_parsed += 1
        key = canonical_sports_key(*parsed)
        kalshi_id = kalshi_by_key.get(key)
        if kalshi_id:
            matched.append({
                "poly_id": mid,
                "kalshi_id": kalshi_id,
                "confidence": 1.0,
                "reasoning": f"Deterministic slug match: {key}",
            })

    logger.info(
        "Sports slug Pass 0: %d poly parseable, %d kalshi parseable -> %d deterministic matches",
        poly_parsed,
        len(kalshi_by_key),
        len(matched),
    )
    return matched
