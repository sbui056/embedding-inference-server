"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { embedTexts } from "./api";
import type { EmbedResult } from "./types";
import { DEMO_EMBEDDINGS } from "./demoData";
import { useReveal } from "./hooks/useReveal";
import {
  HeroVisual,
  EmbeddingHeatmap,
  SimilarityMatrix,
  EmbeddingGraph,
  MetricsPanel,
  ArchitectureDiagram,
  BenchmarkChart,
  LatencyBadge,
} from "./components";

const TECH = [
  "Python", "FastAPI", "asyncio", "sentence-transformers",
  "Redis", "Next.js", "TypeScript", "Docker",
];

const EXAMPLES = [
  {
    label: "Semantic similarity",
    texts: [
      "The cat sat on the mat",
      "A kitten rested on the rug",
      "Stock prices rose sharply",
    ],
  },
  {
    label: "Code vs. natural language",
    texts: [
      "sort an array in python",
      "How to organize a list programmatically",
      "The weather is nice today",
    ],
  },
  {
    label: "Synonyms & antonyms",
    texts: ["happy", "joyful", "melancholy", "ecstatic"],
  },
];

export default function Home() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<EmbedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archStep, setArchStep] = useState(0);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const autoRan = useRef(false);

  const archRef = useReveal();
  const perfRef = useReveal();

  const doEmbed = useCallback(async (texts: string[], useDemo = false) => {
    if (texts.length === 0) return;
    setLoading(true);
    setError(null);
    setArchStep(0);

    const stepDelay = (step: number, ms: number) =>
      new Promise<void>((r) =>
        setTimeout(() => { setArchStep(step); r(); }, ms)
      );

    try {
      await stepDelay(1, 100);
      await stepDelay(2, 200);

      let embeddings: number[][];
      let latency_ms: number;
      let cached: boolean[];

      if (useDemo) {
        const fallback = Object.values(DEMO_EMBEDDINGS)[0];
        embeddings = texts.map((t) => DEMO_EMBEDDINGS[t] || fallback);
        latency_ms = 1.2 + Math.random() * 2;
        cached = texts.map((t) => t in DEMO_EMBEDDINGS);
        await stepDelay(3, 150);
        await stepDelay(4, 100);
        await stepDelay(5, 150);
      } else {
        const result = await embedTexts(texts);
        embeddings = result.embeddings;
        latency_ms = result.latency_ms;
        cached = result.cached;
        const anyCached = cached.some(Boolean);
        if (anyCached) {
          await stepDelay(5, 150);
        } else {
          await stepDelay(3, 150);
          await stepDelay(4, 100);
          await stepDelay(5, 150);
        }
      }

      const newResults: EmbedResult[] = texts.map((text, i) => ({
        text,
        embedding: embeddings[i],
        latencyMs: latency_ms,
        cached: cached[i],
      }));
      setResults((prev) => [...newResults, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setArchStep(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => {
        setServerOnline(h.status === "healthy");
        doEmbed(EXAMPLES[0].texts);
      })
      .catch(() => {
        setServerOnline(false);
        setDemoMode(true);
        doEmbed(EXAMPLES[0].texts, true);
      });
  }, [doEmbed]);

  return (
    <div className="flex flex-col flex-1">
      {/* ── Hero ── */}
      <section className="relative px-6 pt-20 pb-8 md:pt-32 md:pb-16 overflow-hidden min-h-[420px]">
        <HeroVisual />

        <div className="relative max-w-3xl mx-auto flex flex-col items-center text-center gap-5 animate-fade-up">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            {serverOnline === true && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-emerald)] border border-emerald-200 bg-emerald-50 rounded-full px-3 py-1 shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-50 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-emerald)]" />
                </span>
                server live
              </span>
            )}
            {serverOnline === false && demoMode && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-accent)] border border-indigo-200 bg-indigo-50 rounded-full px-3 py-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                demo mode
              </span>
            )}
            {serverOnline === false && !demoMode && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 border border-gray-200 bg-gray-50 rounded-full px-3 py-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                offline
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            <span className="text-[var(--color-foreground)]">Embedding</span>
            <br />
            <span className="text-[var(--color-accent)]">Inference Server</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-gray-500 max-w-lg leading-relaxed">
            Real-time text to vector embeddings.{" "}
            <span className="text-gray-800 font-semibold">90% lower latency</span> and{" "}
            <span className="text-gray-800 font-semibold">11x throughput</span> via
            async batching + Redis caching.
          </p>

          {/* Tech pills */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {TECH.map((t, i) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-full text-[10px] font-mono text-gray-500 border border-gray-200 bg-white shadow-sm hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] hover:shadow-md transition-all cursor-default"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo ── */}
      <section className="px-6 py-10 md:py-16">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400">
              Try it live
            </h2>
            {results.length > 0 && (
              <button
                onClick={() => setResults([])}
                aria-label="Clear all embedding results"
                className="text-[10px] font-mono text-gray-400 hover:text-[var(--color-accent)] transition-colors"
              >
                clear results
              </button>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2.5">
            <label htmlFor="embed-input" className="sr-only">Text to embed</label>
            <input
              id="embed-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) doEmbed([input.trim()]);
              }}
              placeholder="Enter text to embed..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-800 font-mono placeholder:text-gray-300 focus:outline-none focus:border-[var(--color-accent)]/40 focus:ring-2 focus:ring-[var(--color-accent)]/10 transition-all shadow-sm"
              disabled={loading || (serverOnline === false && !demoMode)}
            />
            <button
              onClick={() => input.trim() && doEmbed([input.trim()], demoMode)}
              disabled={loading || !input.trim() || (serverOnline === false && !demoMode)}
              aria-label="Generate embedding"
              className="px-7 py-3.5 bg-[var(--color-accent)] text-white rounded-xl text-sm font-mono font-semibold hover:bg-[var(--color-accent-bright)] disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md hover:shadow-lg"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-label="Loading" />
              ) : (
                "Embed"
              )}
            </button>
          </div>

          {/* Example buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Examples:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => doEmbed([...ex.texts], demoMode)}
                disabled={loading || (serverOnline === false && !demoMode)}
                aria-label={`Try example: ${ex.label}`}
                className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 hover:shadow-md transition-all disabled:opacity-20 active:scale-[0.97] shadow-sm"
              >
                {ex.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="border border-rose-200 bg-rose-50 rounded-xl px-4 py-3 text-[11px] text-[var(--color-rose)] font-mono animate-fade-up">
              {error}
            </div>
          )}

          {/* Results + metrics */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4 animate-fade-up">
              <div className="flex flex-col gap-3">
                {results.map((r, i) => (
                  <div
                    key={`${r.text}-${i}`}
                    className="card rounded-xl p-4 flex flex-col gap-3 card-lift"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-700 break-words flex-1 leading-relaxed">
                        &ldquo;{r.text}&rdquo;
                      </p>
                      <LatencyBadge ms={r.latencyMs} cached={r.cached} />
                    </div>
                    <EmbeddingHeatmap embedding={r.embedding} label={`${r.embedding.length}-dim`} />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <MetricsPanel demoMode={demoMode} />
              </div>
            </div>
          )}

          {/* Metrics when no results */}
          {results.length === 0 && (
            <div className="max-w-[280px]">
              <MetricsPanel demoMode={demoMode} />
            </div>
          )}

          {/* Similarity section */}
          {results.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-scale-in">
              <div className="card rounded-xl p-5 card-lift">
                <EmbeddingGraph results={results} />
              </div>
              <div className="card rounded-xl p-5 card-lift">
                <SimilarityMatrix results={results} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Architecture ── */}
      <section className="px-6 py-12 md:py-20">
        <div ref={archRef} className="max-w-3xl mx-auto reveal">
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight">
              How it works
            </h2>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Architecture</span>
          </div>
          <p className="text-sm text-gray-500 max-w-xl leading-relaxed mb-10">
            Requests flow through validation, a Redis cache check, and on miss
            enter the async batching queue for model inference.
          </p>

          <ArchitectureDiagram activeStep={loading ? archStep : results.length > 0 ? 5 : 0} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-10">
            {[
              { label: "Cache Layer", color: "text-[var(--color-emerald)]", bg: "bg-emerald-50", desc: "SHA-256 keyed Redis cache. Cache hits return in ~0.5ms, skipping the queue entirely." },
              { label: "Async Batcher", color: "text-[var(--color-warm)]", bg: "bg-amber-50", desc: "asyncio.Queue with dual trigger — fires at batch size 32 or after 10ms, whichever comes first." },
              { label: "Model Inference", color: "text-[var(--color-accent)]", bg: "bg-indigo-50", desc: "all-MiniLM-L6-v2 via asyncio.to_thread. 384-dimensional normalized embeddings." },
            ].map((c) => (
              <div key={c.label} className="card rounded-xl p-5 flex flex-col gap-3 card-glow">
                <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${c.color} ${c.bg} w-fit px-2 py-0.5 rounded-md`}>
                  {c.label}
                </span>
                <p className="text-[12px] text-gray-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Performance ── */}
      <section className="px-6 py-12 md:py-20">
        <div ref={perfRef} className="max-w-3xl mx-auto reveal">
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight">
              Performance
            </h2>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Benchmarks</span>
          </div>
          <p className="text-sm text-gray-500 max-w-xl leading-relaxed mb-10">
            50 concurrent users, 60s duration, mixed workload (70% repeated / 30% unique).
          </p>

          <BenchmarkChart />

          <div className="grid grid-cols-3 gap-3 mt-10">
            {[
              { value: "90%", label: "p95 latency reduction", color: "from-[var(--color-accent)] to-[var(--color-accent-bright)]" },
              { value: "11x", label: "throughput increase", color: "from-[var(--color-warm)] to-amber-500" },
              { value: "0.5ms", label: "cache hit latency", color: "from-[var(--color-emerald)] to-emerald-500" },
            ].map((s) => (
              <div key={s.label} className="card rounded-xl py-6 flex flex-col items-center gap-2 card-glow">
                <span
                  className={`text-2xl font-bold font-mono bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}
                >
                  {s.value}
                </span>
                <span className="text-[10px] text-gray-400 font-mono text-center">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 mt-auto">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a
            href="https://github.com/sbui056/embedding-inference-server"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-gray-400 hover:text-[var(--color-accent)] transition-colors"
          >
            github.com/sbui056/embedding-inference-server
          </a>
          <span className="text-[11px] font-mono text-gray-300">
            FastAPI · Redis · Next.js
          </span>
        </div>
      </footer>
    </div>
  );
}
