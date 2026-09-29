const RISK_TIERS = [
  { label: "Low", token: "bg-risk-low" },
  { label: "Moderate", token: "bg-risk-moderate" },
  { label: "High", token: "bg-risk-high" },
  { label: "Critical", token: "bg-risk-critical" },
];

export function MapLegend() {
  return (
    <section aria-label="Map legend" className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Legend
      </h2>

      <div className="space-y-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-foreground/70">
          Landslide data
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="size-3 rounded-full bg-hazard ring-1 ring-hazard/60" aria-hidden />
          Recorded landslide location
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-foreground/70">
          Administrative
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="size-3 rounded-sm border border-primary bg-primary/10" aria-hidden />
          District boundary
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="size-3 rounded-sm border-2 border-hazard bg-hazard/20" aria-hidden />
          Selected district
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-panel-border bg-secondary/60 p-2.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Model-derived risk grid
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {RISK_TIERS.map((t) => (
            <span key={t.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`size-3 rounded-sm ${t.token}`} aria-hidden />
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
