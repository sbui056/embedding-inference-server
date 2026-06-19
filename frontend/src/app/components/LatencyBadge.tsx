"use client";

export default function LatencyBadge({ ms, cached }: { ms: number; cached: boolean }) {
  let color = "text-[var(--color-rose)] bg-rose-50 border-rose-200";
  if (ms < 5) color = "text-[var(--color-emerald)] bg-emerald-50 border-emerald-200";
  else if (ms < 50) color = "text-[var(--color-warm)] bg-amber-50 border-amber-200";
  else if (ms < 200) color = "text-[var(--color-accent)] bg-indigo-50 border-indigo-200";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-mono font-medium ${color}`}>
        {ms.toFixed(1)}ms
      </span>
      {cached && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-mono font-medium text-[var(--color-emerald)] bg-emerald-50 border-emerald-200">
          CACHED
        </span>
      )}
    </div>
  );
}
