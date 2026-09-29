import { Activity } from "lucide-react";
import type { RiskGridResponse } from "@/lib/risk/types";

interface Props {
  grid: RiskGridResponse | null;
  loading: boolean;
  assessmentCount: number;
}

function Card({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-panel-border bg-panel p-2.5">
      <p className="text-[0.6rem] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`font-display text-xl font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

export function RiskOverview({ grid, loading, assessmentCount }: Props) {
  const s = grid?.summary;
  const na = loading ? "…" : "—";
  return (
    <section aria-label="Meghalaya risk overview" className="space-y-2">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Activity className="size-3.5" aria-hidden /> Meghalaya risk overview
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <Card label="Monitored grid areas" value={s ? String(s.total) : na} />
        <Card
          label="High risk areas"
          value={s ? String(s.high) : na}
          tone="text-risk-high"
        />
        <Card
          label="Critical risk areas"
          value={s ? String(s.critical) : na}
          tone="text-risk-critical"
        />
        <Card label="Assessments this session" value={String(assessmentCount)} />
      </div>
      <p className="text-[0.7rem] leading-snug text-muted-foreground">
        Prototype / demonstration data — counts are computed live by the risk engine for the current
        rainfall scenario ({grid ? `${grid.meta.rainfallMm} mm, ${grid.meta.scenario}` : "loading"}).
      </p>
    </section>
  );
}
