import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from server.batcher import BatchProcessor
from server.cache import EmbeddingCache
from server.config import settings
from server.embedding import EmbeddingService
from server.metrics import MetricsCollector
from server.models import (
    EmbedRequest,
    EmbedResponse,
    ErrorResponse,
    HealthResponse,
    MetricsResponse,
)

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

tags_metadata = [
    {"name": "Embedding", "description": "Generate text embeddings via sentence-transformers"},
    {"name": "Monitoring", "description": "Server health checks and performance metrics"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.embedding_service = EmbeddingService(settings.model_name)
    app.state.embedding_service.load_model()
    app.state.metrics = MetricsCollector()
    app.state.start_time = time.time()
    app.state.redis_status = False
    app.state.redis_status_checked = 0.0

    if settings.batching_enabled:
        batcher = BatchProcessor(
            embedding_service=app.state.embedding_service,
            max_batch_size=settings.batch_max_size,
            wait_ms=settings.batch_wait_ms,
        )
        await batcher.start()
        app.state.batcher = batcher
    else:
        app.state.batcher = None

    if settings.cache_enabled:
        cache = EmbeddingCache(
            redis_url=settings.redis_url,
            ttl_seconds=settings.cache_ttl_seconds,
            embedding_dim=app.state.embedding_service.embedding_dim,
            timeout_seconds=settings.redis_timeout_seconds,
        )
        if await cache.ping():
            app.state.cache = cache
            logger.info("Redis cache connected")
        else:
            logger.warning("Redis unavailable, running without cache")
            await cache.close()
            app.state.cache = None
    else:
        app.state.cache = None

    logger.info(
        "Server ready (batching=%s, cache=%s)",
        settings.batching_enabled,
        app.state.cache is not None,
    )
    yield

    if app.state.cache:
        await app.state.cache.close()
    if app.state.batcher:
        await app.state.batcher.stop()
    logger.info("Shutting down")


app = FastAPI(
    title="Embedding Inference Server",
    description=(
        "Production-style API for sentence-transformer embeddings with "
        "async batching and Redis caching."
    ),
    version="1.0.0",
    license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    detail = "; ".join(
        f"{'.'.join(str(loc) for loc in e['loc'])}: {e['msg']}" for e in exc.errors()
    )
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error="validation_error", detail=detail, request_id=request_id
        ).model_dump(),
        headers={"X-Request-ID": request_id} if request_id else {},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post(
    "/embed",
    response_model=EmbedResponse,
    tags=["Embedding"],
    responses={422: {"model": ErrorResponse}, 500: {"description": "Internal server error"}},
)
async def embed(request: EmbedRequest) -> EmbedResponse:
    start = time.perf_counter()
    texts = request.text_list
    cache: EmbeddingCache | None = app.state.cache
    batcher: BatchProcessor | None = app.state.batcher
    num_texts = len(texts)

    cached_flags = [False] * num_texts
    results: list = [None] * num_texts

    if cache:
        cached_embeddings = await cache.mget(texts)
        miss_indices = []
        miss_texts = []
        for i, emb in enumerate(cached_embeddings):
            if emb is not None:
                results[i] = emb
                cached_flags[i] = True
            else:
                miss_indices.append(i)
                miss_texts.append(texts[i])

        hits = num_texts - len(miss_indices)
        await app.state.metrics.record_cache(hits=hits, misses=len(miss_indices))
    else:
        miss_indices = list(range(num_texts))
        miss_texts = texts

    if miss_texts:
        if batcher:
            futures = [batcher.submit(t) for t in miss_texts]
            new_embeddings = await asyncio.gather(*futures)
        else:
            service: EmbeddingService = app.state.embedding_service
            new_embeddings = await asyncio.to_thread(service.encode, miss_texts)

        for idx, emb in zip(miss_indices, new_embeddings):
            results[idx] = emb

        if cache:
            asyncio.create_task(cache.mset(miss_texts, list(new_embeddings)))

    latency_ms = round((time.perf_counter() - start) * 1000, 2)
    await app.state.metrics.record_request(latency_ms, num_texts=num_texts)

    if request.is_single:
        return EmbedResponse(
            embedding=results[0].tolist(),
            latency_ms=latency_ms,
            num_texts=1,
            cached=cached_flags[0],
        )
    return EmbedResponse(
        embeddings=[e.tolist() for e in results],
        latency_ms=latency_ms,
        num_texts=num_texts,
        cached=cached_flags,
    )


_REDIS_STATUS_TTL = 5.0


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Monitoring"],
    responses={500: {"description": "Internal server error"}},
)
async def health() -> HealthResponse:
    service: EmbeddingService = app.state.embedding_service
    cache: EmbeddingCache | None = app.state.cache

    now = time.time()
    if cache and now - app.state.redis_status_checked > _REDIS_STATUS_TTL:
        app.state.redis_status = await cache.ping()
        app.state.redis_status_checked = now

    return HealthResponse(
        status="healthy",
        model_name=service.model_name,
        model_loaded=service.model is not None,
        embedding_dim=service.embedding_dim,
        uptime_seconds=round(now - app.state.start_time, 1),
        redis_connected=app.state.redis_status if cache else False,
    )


@app.get(
    "/metrics",
    response_model=MetricsResponse,
    tags=["Monitoring"],
    responses={500: {"description": "Internal server error"}},
)
async def metrics() -> MetricsResponse:
    data = await app.state.metrics.get_metrics()
    batcher: BatchProcessor | None = app.state.batcher
    if batcher:
        stats = batcher.get_stats()
        data["batch_avg_size"] = stats["avg_batch_size"]
        data["queue_depth"] = stats["queue_depth"]
    return MetricsResponse(**data)
