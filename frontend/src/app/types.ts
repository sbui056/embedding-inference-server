export interface EmbedResult {
  text: string;
  embedding: number[];
  latencyMs: number;
  cached: boolean;
}

export interface Metrics {
  total_requests: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  cache_hit_rate: number | null;
  throughput_rps: number;
}

export interface Health {
  status: string;
  model_name: string;
  model_loaded: boolean;
  embedding_dim: number | null;
  uptime_seconds: number;
  redis_connected: boolean;
}
