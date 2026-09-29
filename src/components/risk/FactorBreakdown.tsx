import type { FactorResult } from "@/lib/risk/types";

function barColor(band: FactorResult["band"]) {
  switch (band) {
    case "VERY HIGH":
      return "bg-risk-critical";
    case "HIGH":
      return "bg-risk-high";
    case "MODERATE":
      return "bg-risk-moderate";
    case "LOW":
      return "bg-risk-low";
    default:
      return "bg-muted-foreground/30";
  }
}

export function FactorBreakdown({ factors }: { factors: FactorResult[] }) {
  return (
    <section aria-label="Factor breakdown" className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Factor breakdown
      </h3>
      <ul className="space-y-2.5">
        {factors.map((f) => (
          <li key={f.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{f.label}</span>
              <span
                className={`text-[0.7rem] font-semibold uppercase tracking-wide ${
                  f.available ? "" : "italic text-muted-foreground"
                }`}
              >
                {f.available ? f.band : "Not available"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${barColor(f.band)}`}
                style={{ width: `${Math.round(f.normalized * 100)}%` }}
                role="presentation"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {f.detail}
              {f.available ? (
                <>
                  {" · "}
                  adds {f.contribution.toFixed(1)} of {Math.round(f.appliedWeight * 100)} possible
                  points
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
        Bars show prototype-normalised factor scores (0–100% of the configured limit), not measured
        probabilities.
      </p>
    </section>
  );
}
