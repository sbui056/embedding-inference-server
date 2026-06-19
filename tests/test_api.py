import asyncio

import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert data["embedding_dim"] == 384
    assert "uptime_seconds" in data


@pytest.mark.asyncio
async def test_metrics(client):
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_requests" in data
    assert "p50_latency_ms" in data
    assert "throughput_rps" in data


@pytest.mark.asyncio
async def test_embed_single(client):
    resp = await client.post("/embed", json={"text": "hello world"})
    assert resp.status_code == 200
    data = resp.json()
    assert "embedding" in data
    assert data["embeddings"] is None
    assert len(data["embedding"]) == 384
    assert data["num_texts"] == 1
    assert data["latency_ms"] > 0


@pytest.mark.asyncio
async def test_embed_batch(client):
    resp = await client.post("/embed", json={"texts": ["hello", "world"]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["embedding"] is None
    assert len(data["embeddings"]) == 2
    assert all(len(e) == 384 for e in data["embeddings"])
    assert data["num_texts"] == 2


@pytest.mark.asyncio
async def test_embed_normalized(client):
    resp = await client.post("/embed", json={"text": "test normalization"})
    data = resp.json()
    emb = data["embedding"]
    magnitude = sum(x * x for x in emb) ** 0.5
    assert abs(magnitude - 1.0) < 0.001


@pytest.mark.asyncio
async def test_embed_similarity(client):
    resp = await client.post(
        "/embed",
        json={"texts": ["cat sitting on a mat", "kitten on a rug", "stock market crash"]},
    )
    data = resp.json()
    embs = data["embeddings"]

    def cosine(a, b):
        return sum(x * y for x, y in zip(a, b))

    sim_close = cosine(embs[0], embs[1])
    sim_far = cosine(embs[0], embs[2])
    assert sim_close > sim_far


@pytest.mark.asyncio
async def test_embed_cache_hit(client):
    text = "cache test unique string xyz 42"
    await client.post("/embed", json={"text": text})
    await asyncio.sleep(0.1)
    resp = await client.post("/embed", json={"text": text})
    data = resp.json()
    assert data["cached"] is True


@pytest.mark.asyncio
async def test_embed_empty_body(client):
    resp = await client.post("/embed", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_embed_empty_text(client):
    resp = await client.post("/embed", json={"text": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_embed_both_fields(client):
    resp = await client.post("/embed", json={"text": "a", "texts": ["b"]})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_embed_too_long(client):
    resp = await client.post("/embed", json={"text": "a" * 1000})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_metrics_after_requests(client):
    await client.post("/embed", json={"text": "metrics test"})
    resp = await client.get("/metrics")
    data = resp.json()
    assert data["total_requests"] >= 1
