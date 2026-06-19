"use client";

import { EmbedResult } from "../types";
import { cosineSimilarity, truncateText } from "../utils";

function simColor(sim: number): string {
  if (sim > 0.7) return "#6366F1";
  if (sim > 0.4) return "#D97706";
  return "#D1D5DB";
}

function simLabel(sim: number): string {
  if (sim > 0.8) return "very similar";
  if (sim > 0.5) return "related";
  if (sim > 0.2) return "weak";
  return "unrelated";
}

export default function EmbeddingGraph({ results }: { results: EmbedResult[] }) {
  const n = results.length;
  if (n < 2) return null;

  const pairs: { a: string; b: string; sim: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push({
        a: results[i].text,
        b: results[j].text,
        sim: cosineSimilarity(results[i].embedding, results[j].embedding),
      });
    }
  }
  pairs.sort((a, b) => b.sim - a.sim);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
        Pairwise Similarity
      </h3>
      <div className="flex flex-col gap-2">
        {pairs.map(({ a, b, sim }, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="text-[9px] font-mono text-gray-500 w-[80px] text-right truncate shrink-0" title={a}>
              {truncateText(a, 12)}
            </span>
            <div className="flex-1 h-5 rounded-full overflow-hidden bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.max(6, sim * 100)}%`,
                  backgroundColor: simColor(sim),
                }}
              />
            </div>
            <span className="text-[9px] font-mono text-gray-500 w-[80px] truncate shrink-0" title={b}>
              {truncateText(b, 12)}
            </span>
            <div className="flex flex-col items-end w-16 shrink-0">
              <span className="text-[11px] font-mono text-gray-700 tabular-nums font-medium">
                {sim.toFixed(2)}
              </span>
              <span className="text-[8px] font-mono text-gray-400">
                {simLabel(sim)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
