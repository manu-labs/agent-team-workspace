"""AI-powered event matching — scores events against user preferences using Groq.

Batches events into groups, sends them to the Groq API along with the user's
interests description, and parses structured match scores back. Results are
persisted to the RSVP table for downstream processing.
"""

import json
import logging
from datetime import datetime, timezone
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.event import Event
from app.models.rsvp import RSVP, RSVPStatus
from app.models.user import User

logger = logging.getLogger(__name__)

# Thresholds for match scores
THRESHOLD_AUTO_RSVP = 0.7  # >= 0.7: auto-RSVP
THRESHOLD_RECOMMEND = 0.4  # 0.4-0.7: recommend to user
BATCH_SIZE = 20  # events per API call
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

_SYSTEM_PROMPT = """You are an event matching assistant. Given a user's interests and a list of events, score each event's relevance to the user from 0.0 (not relevant at all) to 1.0 (perfect match).

Return ONLY a JSON array, no other text. Each element must have:
- "event_id": the exact event ID string provided
- "score": float from 0.0 to 1.0
- "reason": one sentence explaining the score

Example response:
[{"event_id": "abc-123", "score": 0.85, "reason": "Tech networking event matches user's software engineering interests."}]"""


def _build_user_prompt(interests: str, events: list[dict]) -> str:
    lines = [f'User interests: "{interests}"', "", "Events to score:"]
    for e in events:
        date_str = e["date"].isoformat() if hasattr(e["date"], "isoformat") else str(e["date"])
        lines.append(f'- [{e["id"]}] "{e["title"]}" \u2014 {date_str}')
    return "\n".join(lines)


async def _call_groq(interests: str, event_batch: list[dict]) -> list[dict]:
    """Call Groq API via httpx and return parsed match scores."""
    user_prompt = _build_user_prompt(interests, event_batch)

    payload = {
        "model": GROQ_MODEL,
        "max_tokens": 4096,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"].strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        return json.loads(text)
    except (json.JSONDecodeError, httpx.HTTPError, KeyError, IndexError) as exc:
        logger.error("Groq matching failed: %s", exc)
        return []


async def match_events_for_user(user_id: UUID, db: AsyncSession) -> list[dict]:
    """Score all events against a user's interests and persist results.

    Returns a list of {event_id, score, reason, status} dicts.
    """
    # Load user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError(f"User {user_id} not found")
    if not user.interests_description:
        raise ValueError(f"User {user_id} has no interests description")

    # Load all events
    result = await db.execute(select(Event).order_by(Event.date.desc()))
    events = result.scalars().all()
    if not events:
        return []

    # Batch events and call Groq
    event_dicts = [{"id": str(e.id), "title": e.title, "date": e.date} for e in events]
    all_scores: list[dict] = []

    for i in range(0, len(event_dicts), BATCH_SIZE):
        batch = event_dicts[i : i + BATCH_SIZE]
        scores = await _call_groq(user.interests_description, batch)
        all_scores.extend(scores)

    # Build lookup for quick access
    score_map = {s["event_id"]: s for s in all_scores if "event_id" in s and "score" in s}

    # Persist results
    results = []
    now = datetime.now(timezone.utc)
    for event in events:
        eid = str(event.id)
        match = score_map.get(eid)
        score = match["score"] if match else 0.0
        reason = match.get("reason", "") if match else "No match data"

        # Clamp score to valid range
        score = max(0.0, min(1.0, float(score)))

        # Determine status based on threshold
        if score >= THRESHOLD_AUTO_RSVP:
            status = RSVPStatus.pending  # will be picked up by rsvp_runner
        else:
            status = RSVPStatus.skipped

        # Check for existing RSVP to avoid duplicates
        existing = await db.execute(
            select(RSVP).where(RSVP.user_id == user_id, RSVP.event_id == event.id)
        )
        rsvp = existing.scalar_one_or_none()

        if rsvp:
            rsvp.match_score = score
        else:
            rsvp = RSVP(
                user_id=user_id,
                event_id=event.id,
                match_score=score,
                status=status,
                created_at=now,
            )
            db.add(rsvp)

        results.append({
            "event_id": eid,
            "title": event.title,
            "score": score,
            "reason": reason,
            "status": status.value,
        })

    await db.commit()
    return sorted(results, key=lambda r: r["score"], reverse=True)

