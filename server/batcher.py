import asyncio
import logging
import time
from dataclasses import dataclass

import numpy as np

from server.embedding import EmbeddingService

logger = logging.getLogger(__name__)


@dataclass
class BatchItem:
    text: str
    future: asyncio.Future
    enqueue_time: float


class BatchProcessor:
    def __init__(
        self,
        embedding_service: EmbeddingService,
        max_batch_size: int = 32,
        wait_ms: float = 10.0,
    ):
        self.embedding_service = embedding_service
        self.max_batch_size = max_batch_size
        self.wait_ms = wait_ms
        self._queue: asyncio.Queue[BatchItem] = asyncio.Queue()
        self._task: asyncio.Task | None = None
        self._running = False
        self._batches_processed: int = 0
        self._items_processed: int = 0

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._process_loop())
        logger.info(
            "BatchProcessor started (max_size=%d, wait_ms=%.1f)",
            self.max_batch_size,
            self.wait_ms,
        )

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self._drain()
        logger.info("BatchProcessor stopped")

    async def submit(self, text: str) -> np.ndarray:
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        item = BatchItem(text=text, future=future, enqueue_time=time.perf_counter())
        await self._queue.put(item)
        return await future

    async def _process_loop(self) -> None:
        while self._running:
            batch: list[BatchItem] = []

            try:
                item = await asyncio.wait_for(self._queue.get(), timeout=0.1)
                batch.append(item)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                return

            deadline = time.perf_counter() + self.wait_ms / 1000.0
            while len(batch) < self.max_batch_size:
                remaining = deadline - time.perf_counter()
                if remaining <= 0:
                    break
                try:
                    item = await asyncio.wait_for(self._queue.get(), timeout=remaining)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break
                except asyncio.CancelledError:
                    await self._process_batch(batch)
                    return

            await self._process_batch(batch)

    async def _process_batch(self, batch: list[BatchItem]) -> None:
        texts = [item.text for item in batch]
        avg_wait = sum(time.perf_counter() - item.enqueue_time for item in batch) / len(batch)
        logger.debug(
            "Processing batch of %d texts (avg queue wait: %.1fms)",
            len(texts),
            avg_wait * 1000,
        )

        try:
            embeddings = await asyncio.to_thread(self.embedding_service.encode, texts)
            for item, embedding in zip(batch, embeddings):
                if not item.future.cancelled():
                    item.future.set_result(embedding)
        except Exception as e:
            for item in batch:
                if not item.future.cancelled():
                    item.future.set_exception(e)

        self._batches_processed += 1
        self._items_processed += len(batch)

    def get_stats(self) -> dict:
        return {
            "batches_processed": self._batches_processed,
            "items_processed": self._items_processed,
            "avg_batch_size": round(self._items_processed / self._batches_processed, 2)
            if self._batches_processed > 0
            else 0.0,
            "queue_depth": self._queue.qsize(),
        }

    async def _drain(self) -> None:
        batch: list[BatchItem] = []
        while not self._queue.empty():
            try:
                item = self._queue.get_nowait()
                batch.append(item)
            except asyncio.QueueEmpty:
                break

        if batch:
            logger.info("Draining %d remaining items", len(batch))
            await self._process_batch(batch)
