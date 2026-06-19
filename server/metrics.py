import asyncio
import time
from collections import deque


class MetricsCollector:
    def __init__(self):
        self.latencies: deque[float] = deque(maxlen=10000)
        self.total_requests: int = 0
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        self.start_time: float = time.time()
        self._lock = asyncio.Lock()

    async def record_request(self, latency_ms: float, num_texts: int = 1) -> None:
        async with self._lock:
            self.total_requests += num_texts
            for _ in range(num_texts):
                self.latencies.append(latency_ms)

    async def record_cache(self, hits: int = 0, misses: int = 0) -> None:
        async with self._lock:
            self.cache_hits += hits
            self.cache_misses += misses

    def _percentile(self, sorted_data: list[float], p: float) -> float:
        if not sorted_data:
            return 0.0
        k = (len(sorted_data) - 1) * (p / 100.0)
        f = int(k)
        c = f + 1
        if c >= len(sorted_data):
            return sorted_data[f]
        return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])

    async def get_metrics(self) -> dict:
        async with self._lock:
            sorted_latencies = sorted(self.latencies)
            uptime = time.time() - self.start_time
            total_cache = self.cache_hits + self.cache_misses

            return {
                "total_requests": self.total_requests,
                "avg_latency_ms": round(sum(sorted_latencies) / len(sorted_latencies), 2)
                if sorted_latencies
                else 0.0,
                "p50_latency_ms": round(self._percentile(sorted_latencies, 50), 2),
                "p95_latency_ms": round(self._percentile(sorted_latencies, 95), 2),
                "p99_latency_ms": round(self._percentile(sorted_latencies, 99), 2),
                "cache_hit_rate": round(self.cache_hits / total_cache, 4)
                if total_cache > 0
                else None,
                "throughput_rps": round(self.total_requests / uptime, 2) if uptime > 0 else 0.0,
            }
