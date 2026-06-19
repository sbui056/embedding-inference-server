import hashlib

import numpy as np
import pytest

from server.cache import EmbeddingCache, _cache_key


class TestCacheKey:
    def test_deterministic(self):
        assert _cache_key("hello") == _cache_key("hello")

    def test_strips_whitespace(self):
        assert _cache_key("hello") == _cache_key("  hello  ")

    def test_different_texts_differ(self):
        assert _cache_key("hello") != _cache_key("world")

    def test_format(self):
        key = _cache_key("test")
        assert key.startswith("emb:v1:")
        digest = hashlib.sha256("test".encode()).hexdigest()
        assert key == f"emb:v1:{digest}"


@pytest.fixture
async def cache():
    c = EmbeddingCache(
        redis_url="redis://localhost:6379/1",
        ttl_seconds=60,
        embedding_dim=384,
    )
    if not await c.ping():
        pytest.skip("Redis not available")
    yield c
    await c._redis.flushdb()
    await c.close()


@pytest.mark.asyncio
async def test_ping(cache):
    assert await cache.ping() is True


@pytest.mark.asyncio
async def test_mget_miss(cache):
    results = await cache.mget(["never_cached_text"])
    assert len(results) == 1
    assert results[0] is None


@pytest.mark.asyncio
async def test_mset_then_mget(cache):
    texts = ["alpha", "beta"]
    embeddings = [
        np.random.randn(384).astype(np.float32),
        np.random.randn(384).astype(np.float32),
    ]
    await cache.mset(texts, embeddings)
    results = await cache.mget(texts)
    assert results[0] is not None
    assert results[1] is not None
    np.testing.assert_array_almost_equal(results[0], embeddings[0])
    np.testing.assert_array_almost_equal(results[1], embeddings[1])


@pytest.mark.asyncio
async def test_partial_hit(cache):
    texts = ["cached_text", "uncached_text"]
    emb = np.ones(384, dtype=np.float32)
    await cache.mset(["cached_text"], [emb])
    results = await cache.mget(texts)
    assert results[0] is not None
    assert results[1] is None


@pytest.mark.asyncio
async def test_whitespace_normalization(cache):
    emb = np.ones(384, dtype=np.float32)
    await cache.mset(["hello"], [emb])
    results = await cache.mget(["  hello  "])
    assert results[0] is not None
