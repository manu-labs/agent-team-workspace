"""OpenAI embeddings module for pre-filtering market match candidates.

Uses text-embedding-3-small (512 dims) to embed market questions, then
cosine similarity to find candidate pairs before LLM confirmation.

Key functions:
  embed_new_markets(db)              -- embed new/changed markets, store in DB
  find_embedding_candidates(db)      -- return cosine-similar pairs above threshold
"""

import hashlib
import logging
import struct

import httpx
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings"
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIMS = 512
EMBED_BATCH_SIZE = 2048
_SIMILARITY_THRESHOLD = 0.85
_RETRIES = 3

# Active market filter used consistently across embed and candidate queries
_ACTIVE_MARKET_FILTER = "volume > 0 AND yes_price BETWEEN 0.02 AND 0.98"


def _question_hash(question: str) -> str:
    return hashlib.sha256(question.strip().lower().encode()).hexdigest()


def _serialize_embedding(vec: list[float]) -> bytes:
    return struct.pack(f"{len(vec)}f", *vec)


def _deserialize_embedding(blob: bytes, dims: int = EMBED_DIMS) -> np.ndarray:
    return np.array(struct.unpack(f"{dims}f", blob), dtype=np.float32)


async def _call_openai_embed(texts: list[str]) -> list[list[float]]:
    """Call OpenAI embeddings API. Returns list of float vectors in input order."""
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": EMBED_MODEL,
        "input": texts,
        "dimensions": EMBED_DIMS,
    }

    backoff = 1.0
    async with httpx.AsyncClient(timeout=120) as client:
        for attempt in range(_RETRIES):
            try:
                resp = await client.post(OPENAI_EMBED_URL, json=payload, headers=headers)
                if resp.status_code == 429:
                    import asyncio
                    await asyncio.sleep(backoff * 3)
                    backoff *= 2
                    continue
                resp.raise_for_status()
                data = resp.json()
                # Sort by index to preserve input order
                items = sorted(data["data"], key=lambda x: x["index"])
                return [item["embedding"] for item in items]
            except httpx.HTTPStatusError as exc:
                body = exc.response.text[:300] if exc.response else "no body"
                logger.warning(
                    "OpenAI embed HTTP %s (attempt %d): %s",
                    exc.response.status_code, attempt + 1, body,
                )
                if exc.response.status_code < 500:
                    break
            except (httpx.HTTPError, KeyError, IndexError) as exc:
                logger.warning("OpenAI embed error (attempt %d): %s", attempt + 1, exc)
            import asyncio
            await asyncio.sleep(backoff)
            backoff *= 2

    raise RuntimeError(f"OpenAI embed failed after {_RETRIES} attempts")


async def embed_new_markets(db) -> int:
    """Embed new and changed markets, store BLOB in market_embeddings.

    Returns count of markets embedded this call.
    """
    if not settings.OPENAI_API_KEY:
        logger.info("OPENAI_API_KEY not set — skipping embedding")
        return 0

    # Delete embeddings for markets that are no longer active
    await db.execute(
        """DELETE FROM market_embeddings
           WHERE market_id NOT IN (
               SELECT id FROM markets
               WHERE volume > 0 AND yes_price BETWEEN 0.02 AND 0.98
           )"""
    )

    # Find markets with no embedding yet (LEFT JOIN miss)
    cursor = await db.execute(
        """SELECT m.id, m.question
           FROM markets m
           LEFT JOIN market_embeddings me ON me.market_id = m.id
           WHERE me.market_id IS NULL
             AND m.volume > 0
             AND m.yes_price BETWEEN 0.02 AND 0.98"""
    )
    new_markets = [dict(r) for r in await cursor.fetchall()]

    # Find markets whose question changed — single JOIN query, no N+1
    cursor = await db.execute(
        """SELECT m.id, m.question, me.question_hash
           FROM markets m
           JOIN market_embeddings me ON me.market_id = m.id
           WHERE m.volume > 0
             AND m.yes_price BETWEEN 0.02 AND 0.98"""
    )
    rows = await cursor.fetchall()
    changed = [
        {"id": r["id"], "question": r["question"]}
        for r in rows
        if r["question_hash"] != _question_hash(r["question"])
    ]

    to_embed = new_markets + changed
    if not to_embed:
        logger.info("Embed delta: no new or changed markets to embed")
        return 0

    logger.info("Embedding %d markets (%d new, %d changed)", len(to_embed), len(new_markets), len(changed))

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    total_embedded = 0
    for batch_start in range(0, len(to_embed), EMBED_BATCH_SIZE):
        batch = to_embed[batch_start : batch_start + EMBED_BATCH_SIZE]
        questions = [r["question"] for r in batch]

        try:
            vectors = await _call_openai_embed(questions)
        except RuntimeError as exc:
            logger.error("Embedding batch failed: %s", exc)
            break

        for row, vec in zip(batch, vectors):
            blob = _serialize_embedding(vec)
            q_hash = _question_hash(row["question"])
            await db.execute(
                """INSERT INTO market_embeddings (market_id, embedding, question_hash, created_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(market_id) DO UPDATE SET
                       embedding = excluded.embedding,
                       question_hash = excluded.question_hash,
                       created_at = excluded.created_at""",
                (row["id"], blob, q_hash, now),
            )
        total_embedded += len(batch)

    await db.commit()
    logger.info("Embed delta complete: %d markets embedded", total_embedded)
    return total_embedded


async def find_embedding_candidates(db, threshold: float = _SIMILARITY_THRESHOLD) -> list[dict]:
    """Return candidate market pairs with cosine similarity >= threshold.

    Loads all embeddings from DB, computes pairwise cosine similarity via
    numpy matrix multiply, returns sorted list of candidate dicts.

    Returns:
        List of dicts: {poly_id, kalshi_id, confidence, reasoning}
    """
    # Load polymarket embeddings
    poly_cur = await db.execute(
        """SELECT me.market_id, me.embedding
           FROM market_embeddings me
           JOIN markets m ON m.id = me.market_id
           WHERE m.platform = 'polymarket' AND m.volume > 0
             AND m.yes_price BETWEEN 0.02 AND 0.98"""
    )
    poly_rows = await poly_cur.fetchall()

    # Load kalshi embeddings
    kalshi_cur = await db.execute(
        """SELECT me.market_id, me.embedding
           FROM market_embeddings me
           JOIN markets m ON m.id = me.market_id
           WHERE m.platform = 'kalshi' AND m.volume > 0
             AND m.yes_price BETWEEN 0.02 AND 0.98"""
    )
    kalshi_rows = await kalshi_cur.fetchall()

    if not poly_rows or not kalshi_rows:
        logger.info(
            "find_embedding_candidates: no embeddings available (poly=%d, kalshi=%d)",
            len(poly_rows), len(kalshi_rows),
        )
        return []

    poly_ids = [r["market_id"] for r in poly_rows]
    kalshi_ids = [r["market_id"] for r in kalshi_rows]

    poly_vecs = np.array(
        [_deserialize_embedding(r["embedding"]) for r in poly_rows], dtype=np.float32
    )
    kalshi_vecs = np.array(
        [_deserialize_embedding(r["embedding"]) for r in kalshi_rows], dtype=np.float32
    )

    # Normalize rows for cosine similarity
    poly_norms = np.linalg.norm(poly_vecs, axis=1, keepdims=True)
    kalshi_norms = np.linalg.norm(kalshi_vecs, axis=1, keepdims=True)

    poly_norms = np.where(poly_norms == 0, 1, poly_norms)
    kalshi_norms = np.where(kalshi_norms == 0, 1, kalshi_norms)

    poly_norm = poly_vecs / poly_norms
    kalshi_norm = kalshi_vecs / kalshi_norms

    # Matrix multiply: shape (num_poly, num_kalshi)
    similarity = poly_norm @ kalshi_norm.T

    # Find pairs above threshold
    indices = np.argwhere(similarity >= threshold)

    candidates = []
    for i, j in indices:
        confidence = float(similarity[i, j])
        candidates.append({
            "poly_id": poly_ids[i],
            "kalshi_id": kalshi_ids[j],
            "confidence": round(confidence, 4),
            "reasoning": f"Embedding cosine similarity: {confidence:.4f}",
        })

    # Sort by confidence descending
    candidates.sort(key=lambda x: x["confidence"], reverse=True)

    logger.info(
        "find_embedding_candidates: %d candidates from %d poly x %d kalshi markets (threshold=%.2f)",
        len(candidates), len(poly_ids), len(kalshi_ids), threshold,
    )
    return candidates
