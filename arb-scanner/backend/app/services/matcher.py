"""Groq LLM matcher -- two-pass matching between Polymarket and Kalshi markets.

Uses httpx to call Groq API directly (the groq library has connection
issues in Railway network -- same lesson from Auto-RSVP).

Pass 1: Candidate discovery -- batch by category, ask LLM to identify pairs.
Pass 2: Confirmation -- verify resolution criteria match for high-confidence candidates.

Interface: match_markets(poly_markets, kalshi_markets) -> list[dict]
Called by the background poller which handles DB upsert.
"""

import hashlib
import json
import logging
from collections import defaultdict

import httpx

from app.config import settings
from app.database import get_db

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
_CONFIDENCE_THRESHOLD = 0.7
_BATCH_SIZE = 30
_RETRIES = 3


def _cache_key(poly_id: str, kalshi_id: str) -> str:
    raw = f"{poly_id}|{kalshi_id}"
    return hashlib.md5(raw.encode()).hexdigest()


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
                logger.warning("Groq HTTP %s (attempt %d)", exc.response.status_code, attempt + 1)
                if exc.response.status_code < 500:
                    break
            except (httpx.HTTPError, KeyError, IndexError) as exc:
                logger.warning("Groq error (attempt %d): %s", attempt + 1, exc)
            import asyncio
            await asyncio.sleep(backoff)
            backoff *= 2

    return None


def _parse_json_response(text: str) -> list[dict]:
    """Extract JSON array from LLM response, handling markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        start = 1
        end = len(lines)
        for i in range(1, len(lines)):
            if lines[i].strip() == "```":
                end = i
                break
        text = "\n".join(lines[start:end])
    try:
        result = json.loads(text)
        return result if isinstance(result, list) else []
    except json.JSONDecodeError:
        start = text.find("[")
        end = text.rfind("]")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass
    logger.warning("Failed to parse JSON from LLM response")
    return []


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
    }


async def _pass1_candidates(
    poly_markets: list,
    kalshi_markets: list,
) -> list[dict]:
    """Pass 1: Batch markets by category and ask LLM to find matching pairs."""
    if not poly_markets or not kalshi_markets:
        return []

    poly_dicts = [_market_to_dict(m) for m in poly_markets]
    kalshi_dicts = [_market_to_dict(m) for m in kalshi_markets]

    poly_by_cat = defaultdict(list)
    kalshi_by_cat = defaultdict(list)

    for m in poly_dicts:
        cat = (m.get("category") or "uncategorized").lower().strip()
        poly_by_cat[cat].append(m)
    for m in kalshi_dicts:
        cat = (m.get("category") or "uncategorized").lower().strip()
        kalshi_by_cat[cat].append(m)

    all_candidates = []
    all_cats = set(poly_by_cat.keys()) | set(kalshi_by_cat.keys())

    for cat in all_cats:
        poly_list = poly_by_cat.get(cat, [])
        kalshi_list = kalshi_by_cat.get(cat, [])
        if not poly_list or not kalshi_list:
            continue

        for batch_start in range(0, max(len(poly_list), len(kalshi_list)), _BATCH_SIZE):
            poly_batch = poly_list[batch_start:batch_start + _BATCH_SIZE]
            kalshi_batch = kalshi_list[batch_start:batch_start + _BATCH_SIZE]
            if not poly_batch or not kalshi_batch:
                continue

            poly_items = "\n".join(
                f"  - ID: {m['id']}, Question: {m['question']}"
                for m in poly_batch
            )
            kalshi_items = "\n".join(
                f"  - ID: {m['id']}, Question: {m['question']}"
                for m in kalshi_batch
            )

            prompt = f"""Given these Polymarket markets:
{poly_items}

And these Kalshi markets:
{kalshi_items}

Identify pairs that are asking the same underlying question (even if worded differently).
Return ONLY a JSON array. Each element: {{"poly_id": "...", "kalshi_id": "...", "confidence": 0.95, "reasoning": "..."}}
If no matches found, return [].
"""
            system = "You are a prediction market analyst. Match markets across platforms that ask the same question. Be precise -- only match markets with the same resolution criteria. Return valid JSON only."

            response = await _call_groq(prompt, system)
            if response:
                candidates = _parse_json_response(response)
                all_candidates.extend(candidates)
                logger.debug("Pass 1 [%s]: found %d candidates", cat, len(candidates))

    logger.info("Pass 1 complete: %d total candidates across all categories", len(all_candidates))
    return all_candidates


async def _pass2_confirm(candidate: dict, markets_by_id: dict) -> dict | None:
    """Pass 2: Confirm a candidate pair using full market details."""
    poly_id = candidate.get("poly_id", "")
    kalshi_id = candidate.get("kalshi_id", "")
    confidence = float(candidate.get("confidence", 0))

    if confidence < _CONFIDENCE_THRESHOLD:
        return None

    poly = markets_by_id.get(poly_id)
    kalshi = markets_by_id.get(kalshi_id)
    if not poly or not kalshi:
        return None

    prompt = f"""Confirm whether these two prediction markets are asking the SAME question:

Polymarket:
  ID: {poly_id}
  Question: {poly.get('question', '')}
  Category: {poly.get('category', '')}

Kalshi:
  ID: {kalshi_id}
  Question: {kalshi.get('question', '')}
  Category: {kalshi.get('category', '')}

Are these the same market? Would they resolve the same way?
Return JSON: {{"confirmed": true/false, "reasoning": "...", "differences": "any resolution differences"}}
"""
    system = "You are a prediction market analyst. Confirm or reject market matches. Return valid JSON only."

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
    return None


async def match_markets(
    polymarket_markets: list,
    kalshi_markets: list,
) -> list[dict]:
    """Run two-pass matching on the provided market lists.

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

    # Pass 1: Candidate discovery
    candidates = await _pass1_candidates(polymarket_markets, kalshi_markets)

    # Pass 2: Confirmation (skip cached)
    confirmed = []
    cached = 0
    errors = 0

    for cand in candidates:
        poly_id = cand.get("poly_id", "")
        kalshi_id = cand.get("kalshi_id", "")
        key = _cache_key(poly_id, kalshi_id)

        if key in cached_keys:
            cached += 1
            continue

        try:
            result = await _pass2_confirm(cand, all_markets)
            if result:
                confirmed.append(result)
        except Exception as exc:
            logger.error("Error confirming %s <-> %s: %s", poly_id, kalshi_id, exc)
            errors += 1

    logger.info(
        "Matching complete -- candidates: %d, confirmed: %d, cached_skipped: %d, errors: %d",
        len(candidates), len(confirmed), cached, errors,
    )
    return confirmed