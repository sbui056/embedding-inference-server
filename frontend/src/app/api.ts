const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function embedTexts(
  texts: string[]
): Promise<{
  embeddings: number[][];
  latency_ms: number;
  cached: boolean[];
}> {
  const body = texts.length === 1 ? { text: texts[0] } : { texts };

  const res = await fetch(`${API_BASE}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Embed request failed");
  }

  const data = await res.json();

  if (texts.length === 1) {
    return {
      embeddings: [data.embedding],
      latency_ms: data.latency_ms,
      cached: [data.cached],
    };
  }

  return {
    embeddings: data.embeddings,
    latency_ms: data.latency_ms,
    cached: data.cached,
  };
}

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
