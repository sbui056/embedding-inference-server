"use client";

import { EmbedResult } from "../types";
import { cosineSimilarity, truncateText } from "../utils";

function simToColor(sim: number): string {
  if (sim > 0.8) return "rgba(99, 102, 241, 0.15)";
  if (sim > 0.5) return "rgba(99, 102, 241, 0.08)";
  if (sim > 0.2) return "rgba(99, 102, 241, 0.03)";
  return "transparent";
}

export default function SimilarityMatrix({
  results,
}: {
  results: EmbedResult[];
}) {
  if (results.length < 2) return null;

  const n = results.length;
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      matrix[i][j] = cosineSimilarity(results[i].embedding, results[j].embedding);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
          Cosine Similarity
        </h3>
        <span className="text-[9px] font-mono text-gray-400">
          {n} vectors
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse w-full">
          <thead>
            <tr>
              <th className="w-28" />
              {results.map((r, i) => (
                <th
                  key={i}
                  className="text-[9px] text-gray-400 px-1 font-normal pb-1.5 font-mono"
                  title={r.text}
                >
                  {truncateText(r.text, 12)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td
                  className="text-[10px] text-gray-500 pr-2 truncate max-w-[112px] font-mono"
                  title={results[i].text}
                >
                  {truncateText(results[i].text, 16)}
                </td>
                {row.map((sim, j) => (
                  <td
                    key={j}
                    className="h-8 text-center text-[10px] font-mono border border-[var(--color-border-subtle)]"
                    style={{
                      backgroundColor:
                        i === j ? "var(--color-surface-alt)" : simToColor(sim),
                      color:
                        i === j
                          ? "#D1D5DB"
                          : sim > 0.5
                            ? "#6366F1"
                            : "#6B7280",
                    }}
                    title={`"${results[i].text}" vs "${results[j].text}": ${sim.toFixed(4)}`}
                  >
                    {i === j ? "—" : sim.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
