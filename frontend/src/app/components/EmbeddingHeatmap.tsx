"use client";

import { useEffect, useRef } from "react";

export default function EmbeddingHeatmap({
  embedding,
  label,
}: {
  embedding: number[];
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dim = embedding.length;
  const cols = 48;
  const rows = Math.ceil(dim / cols);
  const cellSize = 4;
  const width = cols * cellSize;
  const height = rows * cellSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < dim; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const val = Math.max(-1, Math.min(1, embedding[i]));

      let r: number, g: number, b: number;
      if (val < 0) {
        const s = -val;
        r = Math.round(240 - s * 180);
        g = Math.round(240 - s * 160);
        b = Math.round(245 - s * 10);
      } else {
        r = Math.round(240 - val * 141);
        g = Math.round(240 - val * 138);
        b = Math.round(245 - val * 4);
      }

      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const px = ((row * cellSize + dy) * width + col * cellSize + dx) * 4;
          data[px] = r;
          data[px + 1] = g;
          data[px + 2] = b;
          data[px + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [embedding, dim, width, height]);

  return (
    <div className="flex items-center gap-2.5">
      <canvas
        ref={canvasRef}
        className="rounded border border-[var(--color-border)]"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          imageRendering: "pixelated",
        }}
      />
      <span className="text-[9px] font-mono text-gray-400 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
