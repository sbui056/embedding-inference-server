"use client";

import { useEffect, useState } from "react";

const DATA = [
  { label: "Naive", p95: 540, rps: 100, color: "#D1D5DB" },
  { label: "+ Batching", p95: 89, rps: 570, color: "#D97706" },
  { label: "+ Cache", p95: 54, rps: 1100, color: "#6366F1" },
];

function AnimatedBar({
  value,
  max,
  color,
  delay,
  suffix,
}: {
  value: number;
  max: number;
  color: string;
  delay: number;
  suffix: string;
}) {
  const [width, setWidth] = useState(0);
  const pct = Math.max(3, (value / max) * 100);
  const narrow = pct < 18;

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="h-9 w-full rounded-lg bg-gray-100 flex items-center">
      <div
        className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-[1200ms] ease-out relative overflow-hidden shrink-0"
        style={{ width: `${width}%`, backgroundColor: color }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4) 50%, transparent)`,
            backgroundSize: "200% 100%",
            animation: width > 0 ? "shimmer 2s ease-in-out infinite" : "none",
          }}
        />
        {!narrow && (
          <span className="text-[11px] font-mono font-bold text-white relative z-10 drop-shadow-sm">
            {value}{suffix}
          </span>
        )}
      </div>
      {narrow && (
        <span className="text-[11px] font-mono font-bold ml-2" style={{ color }}>
          {value}{suffix}
        </span>
      )}
    </div>
  );
}

export default function BenchmarkChart() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <div className="flex items-baseline justify-between mb-5">
          <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
            p95 Latency
          </span>
          <span className="text-[10px] font-mono text-gray-400">lower is better</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {DATA.map((d, i) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-[11px] text-gray-500 w-24 text-right font-mono">
                {d.label}
              </span>
              <div className="flex-1">
                <AnimatedBar value={d.p95} max={540} color={d.color} delay={i * 250} suffix="ms" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-5">
          <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
            Throughput
          </span>
          <span className="text-[10px] font-mono text-gray-400">higher is better</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {DATA.map((d, i) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-[11px] text-gray-500 w-24 text-right font-mono">
                {d.label}
              </span>
              <div className="flex-1">
                <AnimatedBar value={d.rps} max={1100} color={d.color} delay={i * 250 + 700} suffix=" rps" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
