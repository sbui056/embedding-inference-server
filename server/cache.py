import asyncio
import hashlib
import logging

import numpy as np
import redis.asyncio as redis

logger = logging.getLogger(__name__)


def _cache_key(text: str) -> str:
    digest = hashlib.sha256(text.strip().encode()).hexdigest()
    return f"emb:v1:{digest}"


class EmbeddingCache:
    def __init__(
        self,
        redis_url: str,
        ttl_seconds: int,
        embedding_dim: int,
        timeout_seconds: float = 2.0,
    ):
        self.ttl_seconds = ttl_seconds
        self.embedding_dim = embedding_dim
        self.timeout_seconds = timeout_seconds
        self._redis: redis.Redis = redis.from_url(redis_url, decode_responses=False)

    async def ping(self) -> bool:
        try:
            return await asyncio.wait_for(self._redis.ping(), timeout=self.timeout_seconds)
        except Exception:
            return False

    async def mget(self, texts: list[str]) -> list[np.ndarray | None]:
        keys = [_cache_key(t) for t in texts]
        try:
            values = await asyncio.wait_for(self._redis.mget(keys), timeout=self.timeout_seconds)
        except Exception:
            logger.warning("Redis mget failed, treating all as misses", exc_info=True)
            return [None] * len(texts)

        results: list[np.ndarray | None] = []
        for v in values:
            if v is not None:
                results.append(np.frombuffer(v, dtype=np.float32).copy())
            else:
                results.append(None)
        return results

    async def mset(self, texts: list[str], embeddings: list[np.ndarray]) -> None:
        try:
            pipe = self._redis.pipeline()
            for text, emb in zip(texts, embeddings):
                key = _cache_key(text)
                pipe.set(key, emb.astype(np.float32).tobytes(), ex=self.ttl_seconds)
            await asyncio.wait_for(pipe.execute(), timeout=self.timeout_seconds)
        except Exception:
            logger.warning("Redis mset failed, skipping cache write", exc_info=True)

    async def close(self) -> None:
        await self._redis.aclose()
