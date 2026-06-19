"use client";

import { useEffect, useState } from "react";
import { fetchMetrics, fetchHealth } from "../api";
import type { Metrics, Health } from "../types";

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-widest text-gray-400 font-mono">
        {label}
      </span>
      <span
        className={`text-sm font-mono font-medium ${accent ? "text-[var(--color-accent)]" : "text-gray-700"}`}
      >
        {value}
        {unit && <span className="text-[9px] text-gray-400 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={`${label}: ${active ? "connected" : "disconnected"}`}>
      <span className="relative flex h-1.5 w-1.5">
        {active && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-40 animate-ping" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            active ? "bg-[var(--color-emerald)]" : "bg-gray-300"
          }`}
        />
      </span>
      <span className="text-[9px] font-mono text-gray-400">{label}</span>
    </div>
  );
}

const DEMO_METRICS: Metrics = {
  total_requests: 1247,
  avg_latency_ms: 3.2,
  p50_latency_ms: 2.1,
  p95_latency_ms: 8.4,
  p99_latency_ms: 14.7,
  cache_hit_rate: 0.73,
  throughput_rps: 142.5,
};

const DEMO_HEALTH: Health = {
  status: "healthy",
  model_name: "all-MiniLM-L6-v2",
  model_loaded: true,
  embedding_dim: 384,
  uptime_seconds: 3847,
  redis_connected: true,
};

export default function MetricsPanel({ demoMode = false }: { demoMode?: boolean }) {
  const [metrics, setMetrics] = useState<(Metrics & Record<string, unknown>) | null>(
    demoMode ? { ...DEMO_METRICS } : null
  );
  const [health, setHealth] = useState<Health | null>(demoMode ? DEMO_HEALTH : null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (demoMode) return;
    let active = true;

    async function poll() {
      try {
        const [m, h] = await Promise.all([fetchMetrics(), fetchHealth()]);
        if (active) {
          setMetrics(m);
          setHealth(h);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [demoMode]);

  if (error) {
    return (
      <div className="card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-rose)]" />
          <span className="text-xs text-[var(--color-rose)] font-mono">unreachable</span>
        </div>
        <p className="text-[10px] text-gray-400 font-mono">
          uvicorn server.main:app --port 8000
        </p>
      </div>
    );
  }

  if (!metrics || !health) {
    return (
      <div className="card rounded-2xl p-4">
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card rounded-2xl flex flex-col card-lift">
      <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-mono flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-40 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          </span>
          {demoMode ? "Demo" : "Live"}
        </span>
        <div className="flex items-center gap-3">
          <StatusDot active={health.model_loaded} label="model" />
          <StatusDot active={health.redis_connected} label="redis" />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="p50" value={metrics.p50_latency_ms.toFixed(1)} unit="ms" />
          <Stat label="p95" value={metrics.p95_latency_ms.toFixed(1)} unit="ms" accent />
          <Stat label="p99" value={metrics.p99_latency_ms.toFixed(1)} unit="ms" />
        </div>
        <div className="h-px bg-[var(--color-border-subtle)]" />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="rps" value={metrics.throughput_rps.toFixed(1)} />
          <Stat label="total" value={metrics.total_requests.toLocaleString()} />
          <Stat
            label="cache"
            value={
              metrics.cache_hit_rate !== null
                ? `${(metrics.cache_hit_rate * 100).toFixed(0)}%`
                : "—"
            }
            accent={metrics.cache_hit_rate !== null && metrics.cache_hit_rate > 0.5}
          />
        </div>
        {typeof metrics.batch_avg_size === "number" && (
          <>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="batch" value={(metrics.batch_avg_size as number).toFixed(1)} unit="avg" />
              <Stat label="queue" value={metrics.queue_depth as number} />
            </div>
          </>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-[var(--color-border-subtle)] flex items-center gap-2">
        <span className="text-[9px] text-gray-400 font-mono">
          {health.model_name} · {health.embedding_dim}d ·{" "}
          {Math.floor(health.uptime_seconds / 60)}m uptime
        </span>
      </div>
    </div>
  );
}
