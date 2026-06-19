import pytest

from server.metrics import MetricsCollector


@pytest.fixture
def collector():
    return MetricsCollector()


@pytest.mark.asyncio
async def test_empty_metrics(collector):
    m = await collector.get_metrics()
    assert m["total_requests"] == 0
    assert m["avg_latency_ms"] == 0.0
    assert m["p50_latency_ms"] == 0.0
    assert m["cache_hit_rate"] is None


@pytest.mark.asyncio
async def test_record_request(collector):
    await collector.record_request(10.0, num_texts=1)
    m = await collector.get_metrics()
    assert m["total_requests"] == 1
    assert m["avg_latency_ms"] == 10.0


@pytest.mark.asyncio
async def test_multiple_requests(collector):
    for lat in [2.0, 4.0, 6.0, 8.0, 10.0]:
        await collector.record_request(lat)
    m = await collector.get_metrics()
    assert m["total_requests"] == 5
    assert m["avg_latency_ms"] == 6.0
    assert m["p50_latency_ms"] == 6.0


@pytest.mark.asyncio
async def test_percentile_calculation(collector):
    for i in range(1, 101):
        await collector.record_request(float(i))
    m = await collector.get_metrics()
    assert m["p50_latency_ms"] == 50.5
    assert m["p95_latency_ms"] == pytest.approx(95.05, abs=0.1)
    assert m["p99_latency_ms"] == pytest.approx(99.01, abs=0.1)


@pytest.mark.asyncio
async def test_cache_tracking(collector):
    await collector.record_cache(hits=3, misses=1)
    m = await collector.get_metrics()
    assert m["cache_hit_rate"] == 0.75


@pytest.mark.asyncio
async def test_cache_all_misses(collector):
    await collector.record_cache(hits=0, misses=5)
    m = await collector.get_metrics()
    assert m["cache_hit_rate"] == 0.0


@pytest.mark.asyncio
async def test_throughput(collector):
    await collector.record_request(1.0, num_texts=10)
    m = await collector.get_metrics()
    assert m["throughput_rps"] > 0


@pytest.mark.asyncio
async def test_batch_text_count(collector):
    await collector.record_request(5.0, num_texts=3)
    m = await collector.get_metrics()
    assert m["total_requests"] == 3
    assert len(collector.latencies) == 3


@pytest.mark.asyncio
async def test_deque_maxlen(collector):
    for i in range(15000):
        await collector.record_request(1.0)
    assert len(collector.latencies) == 10000
    m = await collector.get_metrics()
    assert m["total_requests"] == 15000
