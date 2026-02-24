"""Tests for the embeddings module."""
import hashlib

import numpy as np
import pytest

from app.services.embeddings import (
    EMBED_DIMS,
    _deserialize_embedding,
    _question_hash,
    _serialize_embedding,
    find_embedding_candidates,
)


class TestQuestionHash:
    def test_basic(self):
        text = "Will Bitcoin reach $100K?"
        expected = hashlib.sha256(text.strip().lower().encode()).hexdigest()
        assert _question_hash(text) == expected

    def test_strips_and_lowercases(self):
        assert _question_hash("  Bitcoin  ") == _question_hash("bitcoin")

    def test_deterministic(self):
        assert _question_hash("same text") == _question_hash("same text")

    def test_different_texts_differ(self):
        assert _question_hash("question one") != _question_hash("question two")

    def test_whitespace_interior_preserved(self):
        # Only leading/trailing stripped; interior whitespace matters
        assert _question_hash("a b") != _question_hash("ab")


class TestSerializeDeserialize:
    def test_roundtrip(self):
        vec = [float(i) / EMBED_DIMS for i in range(EMBED_DIMS)]
        blob = _serialize_embedding(vec)
        result = _deserialize_embedding(blob)
        assert isinstance(result, np.ndarray)
        assert len(result) == EMBED_DIMS
        for orig, got in zip(vec, result):
            assert abs(orig - got) < 1e-6

    def test_blob_is_bytes(self):
        vec = [0.5] * EMBED_DIMS
        blob = _serialize_embedding(vec)
        assert isinstance(blob, bytes)

    def test_blob_size_is_float32(self):
        vec = [0.5] * EMBED_DIMS
        blob = _serialize_embedding(vec)
        assert len(blob) == EMBED_DIMS * 4  # float32 = 4 bytes each

    def test_all_zeros(self):
        vec = [0.0] * EMBED_DIMS
        blob = _serialize_embedding(vec)
        result = _deserialize_embedding(blob)
        assert all(v == 0.0 for v in result)

    def test_all_ones(self):
        vec = [1.0] * EMBED_DIMS
        blob = _serialize_embedding(vec)
        result = _deserialize_embedding(blob)
        assert all(abs(v - 1.0) < 1e-6 for v in result)


def _insert_market(db, market_id, platform, question="Test?", yes_price=0.5, volume=100.0):
    """Helper to insert a market row."""
    now = "2026-01-01T00:00:00+00:00"
    return db.execute(
        "INSERT INTO markets (id, platform, question, yes_price, no_price, volume, last_updated) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (market_id, platform, question, yes_price, 1 - yes_price, volume, now),
    )


def _insert_embedding(db, market_id, vec, question="Test?"):
    """Helper to insert an embedding row."""
    blob = _serialize_embedding(vec)
    q_hash = _question_hash(question)
    now = "2026-01-01T00:00:00+00:00"
    return db.execute(
        "INSERT INTO market_embeddings (market_id, embedding, question_hash, created_at) "
        "VALUES (?, ?, ?, ?)",
        (market_id, blob, q_hash, now),
    )


class TestFindEmbeddingCandidates:
    async def test_empty_db_returns_empty(self, in_memory_db):
        results = await find_embedding_candidates(in_memory_db)
        assert results == []

    async def test_no_poly_embeddings_returns_empty(self, in_memory_db):
        await _insert_market(in_memory_db, "kalshi:T1", "kalshi")
        vec = [1.0] + [0.0] * (EMBED_DIMS - 1)
        await _insert_embedding(in_memory_db, "kalshi:T1", vec)
        await in_memory_db.commit()

        results = await find_embedding_candidates(in_memory_db)
        assert results == []

    async def test_no_kalshi_embeddings_returns_empty(self, in_memory_db):
        await _insert_market(in_memory_db, "poly:T1", "polymarket")
        vec = [1.0] + [0.0] * (EMBED_DIMS - 1)
        await _insert_embedding(in_memory_db, "poly:T1", vec)
        await in_memory_db.commit()

        results = await find_embedding_candidates(in_memory_db)
        assert results == []

    async def test_identical_embeddings_found(self, in_memory_db):
        await _insert_market(in_memory_db, "poly:A", "polymarket")
        await _insert_market(in_memory_db, "kalshi:B", "kalshi")

        # Identical unit vectors → cosine similarity = 1.0
        vec = [1.0] + [0.0] * (EMBED_DIMS - 1)
        await _insert_embedding(in_memory_db, "poly:A", vec)
        await _insert_embedding(in_memory_db, "kalshi:B", vec)
        await in_memory_db.commit()

        results = await find_embedding_candidates(in_memory_db)
        assert len(results) == 1
        assert results[0]["poly_id"] == "poly:A"
        assert results[0]["kalshi_id"] == "kalshi:B"
        assert results[0]["confidence"] >= 0.99

    async def test_orthogonal_embeddings_not_found(self, in_memory_db):
        await _insert_market(in_memory_db, "poly:A", "polymarket")
        await _insert_market(in_memory_db, "kalshi:B", "kalshi")

        # Orthogonal vectors → cosine similarity = 0.0 (below threshold)
        vec_poly = [1.0] + [0.0] * (EMBED_DIMS - 1)
        vec_kalshi = [0.0, 1.0] + [0.0] * (EMBED_DIMS - 2)
        await _insert_embedding(in_memory_db, "poly:A", vec_poly)
        await _insert_embedding(in_memory_db, "kalshi:B", vec_kalshi)
        await in_memory_db.commit()

        results = await find_embedding_candidates(in_memory_db)
        assert results == []

    async def test_results_sorted_descending_by_confidence(self, in_memory_db):
        # Two poly markets with different similarity to one kalshi market
        for mid, platform in [("poly:A", "polymarket"), ("poly:B", "polymarket"), ("kalshi:C", "kalshi")]:
            await _insert_market(in_memory_db, mid, platform)

        # poly:A exactly matches kalshi:C (sim=1.0); poly:B partially matches
        vec_full = [1.0] + [0.0] * (EMBED_DIMS - 1)
        # Slightly off-angle (high but <1 similarity)
        import math
        angle_factor = math.cos(math.radians(10))
        vec_partial = [angle_factor, math.sin(math.radians(10))] + [0.0] * (EMBED_DIMS - 2)

        await _insert_embedding(in_memory_db, "poly:A", vec_full)
        await _insert_embedding(in_memory_db, "poly:B", vec_partial)
        await _insert_embedding(in_memory_db, "kalshi:C", vec_full)
        await in_memory_db.commit()

        results = await find_embedding_candidates(in_memory_db)
        assert len(results) >= 1
        confidences = [r["confidence"] for r in results]
        assert confidences == sorted(confidences, reverse=True)

    async def test_candidate_includes_reasoning(self, in_memory_db):
        await _insert_market(in_memory_db, "poly:A", "polymarket")
        await _insert_market(in_memory_db, "kalshi:B", "kalshi")

        vec = [1.0] + [0.0] * (EMBED_DIMS - 1)
        await _insert_embedding(in_memory_db, "poly:A", vec)
        await _insert_embedding(in_memory_db, "kalshi:B", vec)
        await in_memory_db.commit()

        results = await find_embedding_candidates(in_memory_db)
        assert len(results) == 1
        assert "reasoning" in results[0]
        assert "confidence" in results[0]

    async def test_zero_volume_market_excluded(self, in_memory_db):
        # volume=0 markets are excluded by the active market filter
        now = "2026-01-01T00:00:00+00:00"
        await in_memory_db.execute(
            "INSERT INTO markets (id, platform, question, yes_price, no_price, volume, last_updated) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("poly:ZERO", "polymarket", "Zero volume?", 0.5, 0.5, 0.0, now),
        )
        await _insert_market(in_memory_db, "kalshi:B", "kalshi")

        vec = [1.0] + [0.0] * (EMBED_DIMS - 1)
        await _insert_embedding(in_memory_db, "poly:ZERO", vec)
        await _insert_embedding(in_memory_db, "kalshi:B", vec)
        await in_memory_db.commit()

        results = await find_embedding_candidates(in_memory_db)
        assert results == []
