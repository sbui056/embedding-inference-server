"use client";

const steps = [
  { label: "Request", sub: "POST /embed", icon: "→" },
  { label: "Validate", sub: "Pydantic v2", icon: "◇" },
  { label: "Cache", sub: "Redis mget", icon: "◈" },
  { label: "Queue", sub: "asyncio.Queue", icon: "≋" },
  { label: "Model", sub: "transformer", icon: "◉" },
  { label: "Response", sub: "384-dim vec", icon: "←" },
];

export default function ArchitectureDiagram({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative">
      {/* Track */}
      <div className="absolute top-[27px] left-[8%] right-[8%] h-px bg-[var(--color-border)]">
        <div
          className="h-full transition-all duration-700 ease-out relative"
          style={{
            width: `${Math.min(100, (activeStep / (steps.length - 1)) * 100)}%`,
            background: "linear-gradient(90deg, var(--color-accent-bright), var(--color-accent))",
          }}
        >
          {activeStep > 0 && activeStep < steps.length - 1 && (
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]"
              style={{ boxShadow: "0 0 10px var(--color-accent-glow), 0 0 20px var(--color-accent-glow)" }}
            />
          )}
        </div>
      </div>

      <div className="relative flex items-start justify-between">
        {steps.map((step, i) => {
          const isActive = activeStep === i;
          const isPast = activeStep > i;
          const isCacheHit = i === 2 && isActive;

          return (
            <div key={i} className="flex flex-col items-center gap-2.5 relative z-10" style={{ flex: 1 }}>
              <div
                className={`
                  w-[54px] h-[54px] rounded-2xl flex items-center justify-center
                  text-lg transition-all duration-500 border
                  ${isActive
                    ? "bg-indigo-50 border-[var(--color-accent)]/30 text-[var(--color-accent)] scale-110 shadow-lg"
                    : isPast
                      ? "bg-white border-[var(--color-accent)]/15 text-[var(--color-accent-dim)] shadow-sm"
                      : "bg-white border-[var(--color-border)] text-gray-400 shadow-sm"
                  }
                `}
                style={isActive ? { boxShadow: "0 4px 20px var(--color-accent-glow)" } : {}}
              >
                {step.icon}
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <span className={`text-[11px] font-medium transition-colors duration-500 ${
                  isActive ? "text-[var(--color-foreground)]" : isPast ? "text-gray-500" : "text-gray-400"
                }`}>
                  {step.label}
                </span>
                <span className={`text-[9px] font-mono transition-colors duration-500 ${
                  isActive ? "text-[var(--color-accent)]" : "text-gray-400"
                }`}>
                  {step.sub}
                </span>
              </div>

              {isCacheHit && (
                <div className="absolute top-16 text-[9px] text-[var(--color-emerald)] whitespace-nowrap font-mono animate-fade-up font-semibold">
                  ✓ cache hit
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
