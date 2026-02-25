"""Groq LLM matcher -- multi-pass matching between Polymarket and Kalshi markets.

Uses httpx to call Groq API directly (the groq library has connection
issues in Railway network -- same lesson from Auto-RSVP).

Pass 0: Deterministic slug matching -- exact canonical key from slug/ticker (zero LLM calls).
Pass 0b: Sports keyword candidates -- team name/city lookup table (zero LLM calls).
Pass 1: Candidate discovery -- cosine similarity via OpenAI embeddings (zero LLM calls).
Pass 1.5: Date pre-filter -- skip pairs with mismatched end_dates (zero LLM calls).
Pass 1.6: Numeric threshold pre-filter -- skip mismatched dollar/unit values.
Pass 2: Confirmation -- verify resolution criteria match for high-confidence candidates.

Interface: match_markets(poly_markets, kalshi_markets) -> list[dict]
Called by the background poller which handles DB upsert.
"""

import hashlib
import json
import logging
import re
from datetime import datetime

import httpx

from app.config import settings
from app.database import get_db
from app.services.embeddings import find_embedding_candidates
from app.services.sports_matcher import (
    check_sports_orientation,
    match_sports_deterministic,
    parse_poly_slug,
)

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
_CONFIDENCE_THRESHOLD = 0.7
_RETRIES = 3
_MAX_CONFIRMATIONS_PER_CYCLE = 200

# Maximum allowed difference in end_dates (seconds) for a candidate pair
# to proceed to LLM confirmation. Pairs with dates further apart are
# skipped instantly — no LLM call needed.
# 24 hours covers timezone differences and same-day resolution windows.
_DATE_TOLERANCE_SECONDS = 259200  # 3 days — accommodates sports settlement offsets

# In-memory rejection cache — tracks pairs that Groq has already rejected.
# Prevents re-evaluating the same rejected pairs every discovery cycle,
# which previously burned all LLM calls on known-bad pairs.
# Resets on deploy/restart so pairs get a fresh look with any prompt changes.
_rejected_keys: set[str] = set()


def _cache_key(poly_id: str, kalshi_id: str) -> str:
    raw = f"{poly_id}|{kalshi_id}"
    return hashlib.md5(raw.encode()).hexdigest()


def _parse_date(value) -> datetime | None:
    """Parse an end_date value (string or datetime) into a datetime, or None."""
    if isinstance(value, datetime):
        return value
    if not value or value == "unknown":
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _dates_compatible(poly_end, kalshi_end) -> bool:
    """Check if two end_dates are close enough to be the same market.

    Returns True (compatible) if:
    - Either date is missing/unparseable (let LLM decide)
    - Both dates are within _DATE_TOLERANCE_SECONDS of each other

    Returns False (incompatible) if dates differ by more than tolerance.
    """
    poly_dt = _parse_date(poly_end)
    kalshi_dt = _parse_date(kalshi_end)

    # If either date is missing, we can't pre-filter — let LLM decide
    if poly_dt is None or kalshi_dt is None:
        return True

    diff = abs((poly_dt - kalshi_dt).total_seconds())
    return diff <= _DATE_TOLERANCE_SECONDS


# Matches dollar amounts ($2,100 / $100K / $1.5M) and bare numbers with units
# (3 inches, 4.5 inches, 3.0 inches, etc.)
_DOLLAR_RE = re.compile(r"\$([\d,]+(?:\.\d+)?)\s*([KkMmBb])?")
_NUMBER_UNIT_RE = re.compile(r"(\d+(?:\.\d+)?)\s+(?:inches|inch|in)\b", re.IGNORECASE)


def _extract_numeric_thresholds(text: str) -> set[float]:
    """Extract significant numeric thresholds from question text.

    Catches dollar amounts ($2,100 / $100K) and measurement values (3 inches).
    """
    values: set[float] = set()
    # Dollar amounts
    for num_str, suffix in _DOLLAR_RE.findall(text):
        num_str = num_str.replace(",", "")
        multiplier = (
            {"k": 1e3, "m": 1e6, "b": 1e9}.get(suffix.lower(), 1) if suffix else 1
        )
        try:
            values.add(float(num_str) * multiplier)
        except ValueError:
            pass
    # Measurement values (inches for weather markets)
    for num_str in _NUMBER_UNIT_RE.findall(text):
        try:
            values.add(float(num_str))
        except ValueError:
            pass
    return values


def _thresholds_compatible(poly_q: str, kalshi_q: str) -> bool:
    """Return False if both questions contain numeric thresholds that don't overlap.

    Kills crypto price-bin noise (ETH $2,100 vs $2,750) and weather-bin noise
    (rain 3 inches vs 5 inches) without any LLM call.
    If either side has no thresholds, returns True (let LLM decide).
    """
    poly_vals = _extract_numeric_thresholds(poly_q)
    kalshi_vals = _extract_numeric_thresholds(kalshi_q)
    if poly_vals and kalshi_vals and not poly_vals & kalshi_vals:
        return False
    return True


# ---------------------------------------------------------------------------
# Sports team keyword matching (Pass 0b)
# ---------------------------------------------------------------------------

def _build_sports_lookup() -> tuple[dict[str, set[str]], re.Pattern]:
    """Build a sports team lookup and extraction regex.

    Maps lowercase team names / cities / abbreviations to a set of canonical
    city names (lowercase).  Used for deterministic sports candidate matching
    that bypasses embedding similarity entirely.
    """
    from app.services.team_mappings import (
        NBA_TEAMS, NFL_TEAMS, MLB_TEAMS, NHL_TEAMS,
        FULL_ABBREVIATIONS,
    )

    # Definitive set of city names (from FULL_ABBREVIATIONS)
    known_cities: set[str] = set()
    for entries in FULL_ABBREVIATIONS.values():
        for city, _, _ in entries:
            known_cities.add(city.lower())

    lookup: dict[str, set[str]] = {}  # name -> {canonical cities}

    for teams_dict in [NBA_TEAMS, NFL_TEAMS, MLB_TEAMS, NHL_TEAMS]:
        for key, val in teams_dict.items():
            if isinstance(val, str):
                key_l, val_l = key.lower(), val.lower()
                if val_l in known_cities:
                    # key = nickname, val = city
                    lookup.setdefault(key_l, set()).add(val_l)
                    lookup.setdefault(val_l, set()).add(val_l)
                elif key_l in known_cities:
                    # key = city, val = nickname (reverse mapping)
                    lookup.setdefault(val_l, set()).add(key_l)
                    lookup.setdefault(key_l, set()).add(key_l)
            elif isinstance(val, list):
                city_l = key.lower()
                lookup.setdefault(city_l, set()).add(city_l)
                for nick in val:
                    lookup.setdefault(nick.lower(), set()).add(city_l)

    # Abbreviations (FULL_ABBREVIATIONS covers all leagues per abbrev)
    for abbrev, entries in FULL_ABBREVIATIONS.items():
        abbrev_l = abbrev.lower()
        for city, _, _ in entries:
            lookup.setdefault(abbrev_l, set()).add(city.lower())

    # Build regex: longest names first for greedy matching, word-bounded
    all_names = sorted(lookup.keys(), key=len, reverse=True)
    escaped = [re.escape(n) for n in all_names]
    pattern = re.compile(r"\b(?:" + "|".join(escaped) + r")\b", re.IGNORECASE)

    return lookup, pattern


_SPORTS_LOOKUP, _SPORTS_PATTERN = _build_sports_lookup()


def _extract_cities(text: str) -> set[str]:
    """Extract canonical city names from text via the sports team lookup."""
    cities: set[str] = set()
    for m in _SPORTS_PATTERN.finditer(text):
        cities.update(_SPORTS_LOOKUP.get(m.group().lower(), set()))
    return cities


def _find_sports_candidates(
    poly_markets: list, kalshi_markets: list,
) -> list[dict]:
    """Find candidate pairs via sports team / city keyword matching.

    Extracts team / city mentions from each market question and matches pairs
    that reference the same game (>= 2 common canonical cities).
    Deterministic, zero LLM cost.
    """
    poly_cities: dict[str, set[str]] = {}
    for m in poly_markets:
        d = _market_to_dict(m)
        cities = _extract_cities(d.get("question", ""))
        if len(cities) >= 2:
            poly_cities[d["id"]] = cities

    kalshi_cities: dict[str, set[str]] = {}
    for m in kalshi_markets:
        d = _market_to_dict(m)
        q = d.get("question", "")
        cities = _extract_cities(q)
        if len(cities) >= 2:
            kalshi_cities[d["id"]] = cities
    candidates: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for poly_id, p_cities in poly_cities.items():
        for kalshi_id, k_cities in kalshi_cities.items():
            common = p_cities & k_cities
            if len(common) >= 2:
                pair = (poly_id, kalshi_id)
                if pair not in seen:
                    seen.add(pair)
                    candidates.append({
                        "poly_id": poly_id,
                        "kalshi_id": kalshi_id,
                        "confidence": 0.85,
                        "reasoning": f"Sports team match: {', '.join(sorted(common))}",
                    })

    logger.info(
        "Sports keyword pass: %d poly, %d kalshi sports markets -> %d candidates",
        len(poly_cities), len(kalshi_cities), len(candidates),
    )
    return candidates


async def _call_groq(prompt: str, system: str = "") -> str | None:
    """Call Groq API via httpx with retry. Returns response text or None."""
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 4096,
    }

    backoff = 1.0
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(_RETRIES):
            try:
                resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
                if resp.status_code == 429:
                    import asyncio
                    await asyncio.sleep(backoff * 3)
                    backoff *= 2
                    continue
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as exc:
                body = exc.response.text[:500] if exc.response else "no body"
                logger.warning("Groq HTTP %s (attempt %d): %s", exc.response.status_code, attempt + 1, body)
                if exc.response.status_code < 500:
                    break
            except (httpx.HTTPError, KeyError, IndexError) as exc:
                logger.warning("Groq error (attempt %d): %s", attempt + 1, exc)
            import asyncio
            await asyncio.sleep(backoff)
            backoff *= 2

    return None


async def _get_cached_match_keys(db) -> set[str]:
    """Load cache keys of existing confirmed matches."""
    cursor = await db.execute("SELECT polymarket_id, kalshi_id FROM matches")
    rows = await cursor.fetchall()
    return {_cache_key(r["polymarket_id"], r["kalshi_id"]) for r in rows}


def _market_to_dict(market) -> dict:
    """Convert a NormalizedMarket (or similar) to a plain dict for prompt building."""
    if isinstance(market, dict):
        return market
    return {
        "id": market.id,
        "question": market.question,
        "category": getattr(market, "category", ""),
        "yes_price": market.yes_price,
        "no_price": market.no_price,
        "volume": getattr(market, "volume", 0),
        "url": getattr(market, "url", ""),
        "end_date": getattr(market, "end_date", ""),
        "event_slug": getattr(market, "event_slug", ""),
        "event_ticker": getattr(market, "event_ticker", ""),
        "sports_market_type": getattr(market, "sports_market_type", ""),
    }


async def _pass2_confirm(candidate: dict, markets_by_id: dict) -> dict | None:
    """Pass 2: Confirm a candidate pair using full market details.

    Returns a match dict if the LLM confirms the pair is the same market
    with aligned YES/NO orientation. Returns None if rejected (different
    questions or inverted orientation — inverted sports pairs are rejected
    rather than flagged, per the simplified scope).
    """
    poly_id = candidate.get("poly_id", "")
    kalshi_id = candidate.get("kalshi_id", "")
    confidence = float(candidate.get("confidence", 0))

    if confidence < _CONFIDENCE_THRESHOLD:
        return None

    poly = markets_by_id.get(poly_id)
    kalshi = markets_by_id.get(kalshi_id)
    if not poly or not kalshi:
        return None

    prompt = f"""Do these two prediction markets ask the EXACT SAME underlying question?

Polymarket:
  Question: {poly.get('question', '')}
  Category: {poly.get('category', '')}

Kalshi:
  Question: {kalshi.get('question', '')}
  Category: {kalshi.get('category', '')}

RULES:
1. CONFIRMED + not inverted: Both contracts resolve YES under the same conditions.
2. CONFIRMED + inverted: Same underlying event, but YES/NO is flipped between platforms.
   This happens when one platform asks "Will Team A win?" and the other asks "Will Team B win?"
   for the same game, or one uses "Will X happen?" and the other "Will X NOT happen?"
3. REJECTED: Different underlying events, different resolution criteria, or unrelated questions.

Examples — CONFIRMED not inverted:
  - "Will OKC win?" / "Will OKC win?" → same YES side
  - "Bitcoin above $100K by March?" / "Bitcoin above $100K by March?" → same

Examples — CONFIRMED inverted (same event, opposite YES sides):
  - "Will Bartunkova win?" (Poly YES=Bartunkova) / "Will Townsend win?" (Kalshi YES=Townsend)
  - "Will Team A win?" / "Will Team B win?" → same game, opposite sides
  - "Will X happen?" / "Will X NOT happen?" → same event, inverted framing

Examples — REJECTED:
  - "Will X win?" / "Will Y win?" where X and Y are unrelated events
  - "XRP reach $1.80" / "XRP trimmed mean above $1.80" → different resolution criteria
  - "Annual inflation 2.3%" / "Trump signs EO" → completely different events

Return JSON only:
{{"confirmed": true/false, "inverted": true/false, "reasoning": "brief explanation"}}
"""
    system = "You are a prediction market analyst. Confirm matches and detect YES/NO inversions. Return valid JSON only."

    response = await _call_groq(prompt, system)
    if not response:
        return None

    try:
        text = response.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:])
            if text.rstrip().endswith("```"):
                text = text.rstrip()[:-3]
        result = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                result = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                return None
        else:
            return None

    if result.get("confirmed"):
        llm_inverted = bool(result.get("inverted", False))

        if llm_inverted:
            # Inverted matches are rejected — same event but wrong YES/NO orientation.
            # We only keep same-direction matches.
            logger.info(
                "Rejecting inverted LLM match: %s <-> %s. Reason: %s",
                poly_id, kalshi_id, result.get("reasoning", ""),
            )
            return None

        return {
            "polymarket_id": poly_id,
            "kalshi_id": kalshi_id,
            "confidence": confidence,
            "question": poly.get("question", ""),
            "polymarket_yes": poly.get("yes_price", 0),
            "kalshi_yes": kalshi.get("yes_price", 0),
        }
    else:
        logger.info(
            "Rejected match: %s <-> %s. Reason: %s",
            poly_id, kalshi_id, result.get("reasoning", ""),
        )
        return None


async def match_markets(
    polymarket_markets: list,
    kalshi_markets: list,
) -> list[dict]:
    """Run multi-pass matching on the provided market lists.

    Pass 0:  Deterministic slug matching — exact canonical key match (confidence=1.0,
             bypass LLM entirely). Only ALIGNED Kalshi markets returned; inverted skipped.
    Pass 0b: Sports keyword candidates (confidence=0.85, LLM confirmed).
    Pass 1:  Embedding cosine similarity (zero LLM calls).
    Pass 1.5: Date pre-filter — skip pairs with mismatched end_dates.
    Pass 1.6: Numeric threshold pre-filter — skip mismatched dollar/unit values.
    Pass 2:  Groq LLM confirmation (capped at _MAX_CONFIRMATIONS_PER_CYCLE).
             Sports matches where LLM detects inversion are rejected.
             Secondary deterministic orientation check applied to all sports LLM matches.

    Args:
        polymarket_markets: List of NormalizedMarket or dicts from Polymarket
        kalshi_markets: List of NormalizedMarket or dicts from Kalshi

    Returns:
        List of confirmed match dicts, each with:
        polymarket_id, kalshi_id, confidence, question, polymarket_yes, kalshi_yes
    """
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set, skipping matching")
        return []

    if not polymarket_markets or not kalshi_markets:
        logger.info("No markets to match (poly=%d, kalshi=%d)",
                     len(polymarket_markets), len(kalshi_markets))
        return []

    db = await get_db()
    cached_keys = await _get_cached_match_keys(db)

    # Build lookup by ID for pass 2
    all_markets = {}
    for m in polymarket_markets:
        d = _market_to_dict(m)
        all_markets[d["id"]] = d
    for m in kalshi_markets:
        d = _market_to_dict(m)
        all_markets[d["id"]] = d

    # Pass 0: Deterministic slug matching (confidence=1.0, bypass LLM entirely)
    # Only ALIGNED Kalshi markets are returned — inverted are skipped at source.
    det_raw = match_sports_deterministic(polymarket_markets, kalshi_markets)
    det_confirmed: list[dict] = []
    deterministic_pairs: set[tuple[str, str]] = set()

    for d in det_raw:
        poly_id = d["poly_id"]
        kalshi_id = d["kalshi_id"]
        key = _cache_key(poly_id, kalshi_id)

        if key in cached_keys:
            deterministic_pairs.add((poly_id, kalshi_id))
            continue

        poly_m = all_markets.get(poly_id, {})
        kalshi_m = all_markets.get(kalshi_id, {})

        det_confirmed.append({
            "polymarket_id": poly_id,
            "kalshi_id": kalshi_id,
            "confidence": 1.0,
            "question": poly_m.get("question", ""),
            "polymarket_yes": poly_m.get("yes_price", 0),
            "kalshi_yes": kalshi_m.get("yes_price", 0),
        })
        deterministic_pairs.add((poly_id, kalshi_id))
        cached_keys.add(key)  # prevent double-matching in subsequent passes

    logger.info("Pass 0: %d deterministic slug matches (%d new)", len(det_raw), len(det_confirmed))

    # Pass 0b: Sports keyword candidates (confidence=0.85)
    # Filter out pairs already matched deterministically
    kw_candidates = _find_sports_candidates(polymarket_markets, kalshi_markets)
    kw_candidates = [
        c for c in kw_candidates
        if (c["poly_id"], c["kalshi_id"]) not in deterministic_pairs
    ]

    # Pass 1: Candidate discovery via embeddings (zero LLM calls)
    embedding_candidates = await find_embedding_candidates(db)
    logger.info("Pass 1: %d embedding candidates", len(embedding_candidates))

    # Merge keyword + embedding candidates, dedup by (poly_id, kalshi_id)
    # Skip pairs already matched deterministically
    seen_pairs = {(c["poly_id"], c["kalshi_id"]) for c in embedding_candidates}
    seen_pairs |= deterministic_pairs
    candidates = list(embedding_candidates)
    kw_added = 0
    for kc in kw_candidates:
        if (kc["poly_id"], kc["kalshi_id"]) not in seen_pairs:
            candidates.append(kc)
            seen_pairs.add((kc["poly_id"], kc["kalshi_id"]))
            kw_added += 1

    logger.info(
        "Candidate merge: %d embedding + %d keyword-only -> %d total (excl. %d deterministic)",
        len(embedding_candidates), kw_added, len(candidates), len(deterministic_pairs),
    )

    # Pass 2: Confirmation (skip cached + rejected + date-mismatched,
    # cap LLM calls at _MAX_CONFIRMATIONS_PER_CYCLE)
    confirmed = []
    cached = 0
    rejected_skipped = 0
    date_skipped = 0
    threshold_skipped = 0
    errors = 0
    llm_calls = 0

    for cand in candidates:
        if llm_calls >= _MAX_CONFIRMATIONS_PER_CYCLE:
            logger.info(
                "Pass 2: reached confirmation cap (%d), stopping early",
                _MAX_CONFIRMATIONS_PER_CYCLE,
            )
            break

        poly_id = cand.get("poly_id", "")
        kalshi_id = cand.get("kalshi_id", "")
        key = _cache_key(poly_id, kalshi_id)

        if key in cached_keys:
            cached += 1
            continue

        if key in _rejected_keys:
            rejected_skipped += 1
            continue

        # Pass 1.5: Date pre-filter — skip pairs with clearly mismatched
        # end_dates without burning an LLM call.
        poly_market = all_markets.get(poly_id, {})
        kalshi_market = all_markets.get(kalshi_id, {})
        if not _dates_compatible(poly_market.get("end_date"), kalshi_market.get("end_date")):
            date_skipped += 1
            _rejected_keys.add(key)
            continue

        # Pass 1.6: Numeric threshold pre-filter.
        if not _thresholds_compatible(
            poly_market.get("question", ""), kalshi_market.get("question", "")
        ):
            threshold_skipped += 1
            _rejected_keys.add(key)
            continue

        try:
            result = await _pass2_confirm(cand, all_markets)
            llm_calls += 1
            if result:
                # For sports LLM matches: run deterministic orientation check as
                # a secondary validation. If it says inverted, reject the match
                # (trust the deterministic check over LLM for sports orientation).
                poly_slug = poly_market.get("event_slug", "")
                parsed = parse_poly_slug(poly_slug)
                if parsed:
                    _, team1, team2, _ = parsed
                    orientation = check_sports_orientation(kalshi_id, team1, team2)
                    if orientation == "inverted":
                        logger.info(
                            "Orientation check rejected inverted LLM match: %s <-> %s",
                            poly_id, kalshi_id,
                        )
                        _rejected_keys.add(key)
                        continue  # reject — don't add to confirmed
                confirmed.append(result)
            else:
                _rejected_keys.add(key)
        except Exception as exc:
            logger.error("Error confirming %s <-> %s: %s", poly_id, kalshi_id, exc)
            errors += 1

    logger.info(
        "Matching complete -- det: %d, llm_candidates: %d, llm_calls: %d, confirmed: %d, "
        "cached_skipped: %d, rejected_skipped: %d, date_skipped: %d, "
        "threshold_skipped: %d, errors: %d",
        len(det_confirmed), len(candidates), llm_calls, len(confirmed),
        cached, rejected_skipped, date_skipped, threshold_skipped, errors,
    )
    return det_confirmed + confirmed
