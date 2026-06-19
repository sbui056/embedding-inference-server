import pytest
from pydantic import ValidationError

from server.models import EmbedRequest, EmbedResponse, HealthResponse, MetricsResponse


class TestEmbedRequest:
    def test_single_text(self):
        req = EmbedRequest(text="hello")
        assert req.text_list == ["hello"]
        assert req.is_single is True

    def test_multiple_texts(self):
        req = EmbedRequest(texts=["a", "b", "c"])
        assert req.text_list == ["a", "b", "c"]
        assert req.is_single is False

    def test_neither_field_raises(self):
        with pytest.raises(ValidationError, match="Either 'text' or 'texts'"):
            EmbedRequest()

    def test_both_fields_raises(self):
        with pytest.raises(ValidationError, match="not both"):
            EmbedRequest(text="hello", texts=["world"])

    def test_empty_string_raises(self):
        with pytest.raises(ValidationError, match="empty"):
            EmbedRequest(text="")

    def test_whitespace_only_raises(self):
        with pytest.raises(ValidationError, match="empty"):
            EmbedRequest(text="   ")

    def test_empty_in_list_raises(self):
        with pytest.raises(ValidationError, match="empty"):
            EmbedRequest(texts=["hello", ""])

    def test_exceeds_max_length(self):
        long_text = "a" * 1000
        with pytest.raises(ValidationError, match="max length"):
            EmbedRequest(text=long_text)

    def test_exceeds_max_batch_texts(self):
        texts = [f"text {i}" for i in range(200)]
        with pytest.raises(ValidationError, match="Too many texts"):
            EmbedRequest(texts=texts)


class TestEmbedResponse:
    def test_single_response(self):
        resp = EmbedResponse(
            embedding=[0.1, 0.2, 0.3],
            latency_ms=1.5,
            num_texts=1,
            cached=False,
        )
        assert resp.embedding == [0.1, 0.2, 0.3]
        assert resp.embeddings is None

    def test_batch_response(self):
        resp = EmbedResponse(
            embeddings=[[0.1], [0.2]],
            latency_ms=3.0,
            num_texts=2,
            cached=[False, True],
        )
        assert resp.embedding is None
        assert len(resp.embeddings) == 2


class TestHealthResponse:
    def test_healthy(self):
        resp = HealthResponse(
            status="healthy",
            model_name="test-model",
            model_loaded=True,
            embedding_dim=384,
            uptime_seconds=10.0,
            redis_connected=True,
        )
        assert resp.status == "healthy"
        assert resp.redis_connected is True


class TestMetricsResponse:
    def test_metrics(self):
        resp = MetricsResponse(
            total_requests=100,
            avg_latency_ms=5.0,
            p50_latency_ms=4.0,
            p95_latency_ms=10.0,
            p99_latency_ms=15.0,
            cache_hit_rate=0.75,
            throughput_rps=50.0,
        )
        assert resp.cache_hit_rate == 0.75

    def test_null_cache_rate(self):
        resp = MetricsResponse(
            total_requests=0,
            avg_latency_ms=0,
            p50_latency_ms=0,
            p95_latency_ms=0,
            p99_latency_ms=0,
            cache_hit_rate=None,
            throughput_rps=0,
        )
        assert resp.cache_hit_rate is None
