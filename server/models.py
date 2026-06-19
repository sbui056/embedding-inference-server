from pydantic import BaseModel, Field, model_validator

from server.config import settings


class EmbedRequest(BaseModel):
    text: str | None = Field(
        default=None, description="Single text to embed (mutually exclusive with texts)"
    )
    texts: list[str] | None = Field(
        default=None, description="Batch of texts to embed (mutually exclusive with text)"
    )

    model_config = {"json_schema_extra": {"examples": [{"text": "hello world"}]}}

    @model_validator(mode="after")
    def validate_input(self) -> "EmbedRequest":
        if self.text is None and self.texts is None:
            raise ValueError("Either 'text' or 'texts' must be provided")
        if self.text is not None and self.texts is not None:
            raise ValueError("Provide either 'text' or 'texts', not both")

        items = [self.text] if self.text is not None else self.texts
        if len(items) > settings.max_batch_texts:
            raise ValueError(
                f"Too many texts ({len(items)}), maximum is {settings.max_batch_texts}"
            )
        for i, t in enumerate(items):
            if not t or not t.strip():
                raise ValueError(f"Text at index {i} is empty")
            if len(t) > settings.max_text_length:
                raise ValueError(
                    f"Text at index {i} exceeds max length of {settings.max_text_length}"
                )
        return self

    @property
    def text_list(self) -> list[str]:
        return [self.text] if self.text is not None else self.texts

    @property
    def is_single(self) -> bool:
        return self.text is not None


class EmbedResponse(BaseModel):
    embedding: list[float] | None = Field(
        default=None, description="384-dim normalized embedding (single text)"
    )
    embeddings: list[list[float]] | None = Field(
        default=None, description="List of 384-dim normalized embeddings (batch)"
    )
    latency_ms: float = Field(description="Server-side latency in milliseconds")
    num_texts: int = Field(description="Number of texts processed")
    cached: bool | list[bool] = Field(
        default=False, description="Whether each result was served from cache"
    )


class ErrorResponse(BaseModel):
    error: str = Field(description="Error category")
    detail: str = Field(description="Human-readable error message")
    request_id: str | None = Field(default=None, description="Request trace ID")


class HealthResponse(BaseModel):
    status: str = Field(description="Server health status")
    model_name: str = Field(description="Loaded sentence-transformer model")
    model_loaded: bool = Field(description="Whether model is ready for inference")
    embedding_dim: int | None = Field(
        default=None, description="Dimensionality of output embeddings"
    )
    uptime_seconds: float = Field(description="Seconds since server start")
    redis_connected: bool = Field(default=False, description="Redis cache connectivity")


class MetricsResponse(BaseModel):
    total_requests: int = Field(description="Total texts processed")
    avg_latency_ms: float = Field(description="Average response latency")
    p50_latency_ms: float = Field(description="Median latency")
    p95_latency_ms: float = Field(description="95th percentile latency")
    p99_latency_ms: float = Field(description="99th percentile latency")
    cache_hit_rate: float | None = Field(
        default=None, description="Fraction of requests served from cache"
    )
    throughput_rps: float = Field(description="Requests per second")
    batch_avg_size: float | None = Field(
        default=None, description="Average batch size (when batching enabled)"
    )
    queue_depth: int | None = Field(default=None, description="Current batcher queue depth")
