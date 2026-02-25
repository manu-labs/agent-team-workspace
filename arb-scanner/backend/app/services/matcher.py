"""Groq LLM matcher -- two-pass matching between Polymarket and Kalshi markets.

Uses httpx to call Groq API directly (the groq library has connection
issues in Railway network -- same lesson from Auto-RSVP).

Pass 1: Candidate discovery -- cosine similarity via OpenAI embeddings (zero LLM calls).
Pass 1.5: Date pre-filter -- skip pairs with mismatched end_dates (zero LLM calls).
Pass 2: Confirmation -- verify resolution criteria match for high-confidence candidates.

Interface: match_markets(poly_markets, kalshi_markets) -> list[dict]
Called by the background poller which handles DB upsert.
"""

import hashlib
import json
import logging
from datetime import datetime

import httpx

from app.config import settings
from app.database import get_db
from app.services.embeddings import find_embedding_candidates

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
_DATE_TOLERANCE_SECONDS = 3600  # 1 hour

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
    }


async def _pass2_confirm(candidate: dict, markets_by_id: dict) -> dict | None:
    """Pass 2: Confirm a candidate pair using full market details.

    Only confirms matches where both contracts ask the same question AND
    YES means the same thing on both platforms. Rejects inverted/opposite-side
    contracts instead of flipping prices.
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

    poly_end = poly.get("end_date", "unknown")
    kalshi_end = kalshi.get("end_date", "unknown")

    prompt = f"""Determine whether these two prediction markets are asking the EXACT SAME question with the SAME YES/NO orientation AND the SAME resolution deadline:

Polymarket:
  ID: {poly_id}
  Question: {poly.get('question', '')}
  Category: {poly.get('category', '')}
  End date / Resolution deadline: {poly_end}

Kalshi:
  ID: {kalshi_id}
  Question: {kalshi.get('question', '')}
  Category: {kalshi.get('category', '')}
  End date / Resolution deadline: {kalshi_end}

IMPORTANT RULES:
1. Both contracts must resolve YES under the same conditions and NO under the same conditions.
2. CRITICAL: Resolution dates/deadlines MUST match. If one market resolves "by Feb 28" and the other "by Mar 31", they are DIFFERENT markets even if the question text is similar. Different deadlines = confirmed: false.
3. If either end_date is missing or "unknown", and the question text contains a specific date/deadline, use that instead.

Examples of SAME orientation (confirmed=true):
  - Poly: "Will Team A win?" / Kalshi: "Will Team A win?" (same deadline) → same question, same YES
  - Poly: "Bitcoin above $100K by March 31?" / Kalshi: "Bitcoin above $100K by March 31?" → same

Examples that should be REJECTED (confirmed=false):
  - Poly: "Will Player A win?" / Kalshi: "Will Player B win?" → opposite sides of same event
  - Poly: "Will X happen?" / Kalshi: "Will X NOT happen?" → inverted framing
  - Poly: "Will X happen by Feb 28?" / Kalshi: "Will X happen by Mar 31?" → DIFFERENT deadlines

Return JSON only:
{{"confirmed": true/false, "reasoning": "brief explanation"}}
- confirmed: true ONLY if both contracts ask the same question AND YES means the same thing on both AND they have the same resolution deadline
- confirmed: false if they are opposite sides, inverted, different events, OR have different deadlines
"""
    system = "You are a prediction market analyst. Confirm or reject market matches. Only confirm if both contracts have identical resolution criteria, YES/NO orientation, AND resolution deadline. Return valid JSON only."

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
            "Rejected match (not same orientation): %s <-> %s. Reason: %s",
            poly_id, kalshi_id, result.get("reasoning", ""),
        )
        return None


async def match_markets(
    polymarket_markets: list,
    kalshi_markets: list,
) -> list[dict]:
    """Run two-pass matching on the provided market lists.

    Pass 1: Embedding cosine similarity (zero LLM calls).
    Pass 1.5: Date pre-filter — skip pairs with mismatched end_dates (zero LLM calls).
    Pass 2: Groq LLM confirmation (capped at _MAX_CONFIRMATIONS_PER_CYCLE).

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

    # Pass 1: Candidate discovery via embeddings (zero LLM calls)
    candidates = await find_embedding_candidates(db)
    if not candidates:
        logger.info("Pass 1: no embedding candidates — embeddings may not be ready yet")
        return []

    logger.info("Pass 1 complete: %d embedding candidates", len(candidates))

    # Pass 2: Confirmation (skip cached + rejected + date-mismatched,
    # cap LLM calls at _MAX_CONFIRMATIONS_PER_CYCLE)
    confirmed = []
    cached = 0
    rejected_skipped = 0
    date_skipped = 0
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
        # end_dates without burning an LLM call. Eliminates ~90% of crypto
        # price bin false candidates (e.g. BTC Feb 26 17:00 vs Feb 27 22:00).
        poly_market = all_markets.get(poly_id, {})
        kalshi_market = all_markets.get(kalshi_id, {})
        if not _dates_compatible(poly_market.get("end_date"), kalshi_market.get("end_date")):
            date_skipped += 1
            _rejected_keys.add(key)
            continue

        try:
            result = await _pass2_confirm(cand, all_markets)
            llm_calls += 1
            if result:
                confirmed.append(result)
            else:
                # Add to rejection cache so we don't re-evaluate next cycle
                _rejected_keys.add(key)
        except Exception as exc:
            logger.error("Error confirming %s <-> %s: %s", poly_id, kalshi_id, exc)
            errors += 1

    logger.info(
        "Matching complete -- candidates: %d, llm_calls: %d, confirmed: %d, "
        "cached_skipped: %d, rejected_skipped: %d, date_skipped: %d, errors: %d",
        len(candidates), llm_calls, len(confirmed), cached, rejected_skipped,
        date_skipped, errors,
    )
    return confirmed
