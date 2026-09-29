import { LEVEL_ORDER, LEVEL_TOKEN } from "@/lib/risk/level-style";

/** Floating map legend for the model-derived risk categories. */
export function RiskLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-label="Risk legend"
      className={`pointer-events-none select-none panel-surface ${
        compact ? "flex items-center gap-2 px-2 py-1.5" : "space-y-1.5 px-3 py-2.5"
      }`}
    >
      {compact ? null : (
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
          Model-derived risk
        </p>
      )}
      <div className={compact ? "flex items-center gap-2" : "space-y-1"}>
        {LEVEL_ORDER.map((level) => (
          <span
            key={level}
            className={`flex items-center gap-1.5 ${compact ? "text-[0.6rem]" : "text-xs"} font-medium`}
          >
            <span className={`size-2.5 rounded-sm ${LEVEL_TOKEN[level]}`} aria-hidden />
            {compact ? level.charAt(0) + level.slice(1, 3).toLowerCase() : level}
          </span>
        ))}
      </div>
      {compact ? null : (
        <p className="max-w-[11rem] text-[0.65rem] leading-snug text-muted-foreground">
          Prototype categories from the weighted risk model — not an official hazard map.
        </p>
      )}
    </div>
  );
}
