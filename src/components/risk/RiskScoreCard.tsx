import { Database, Info, ShieldAlert } from "lucide-react";
import { LEVEL_TOKEN } from "@/lib/risk/level-style";
import type { RiskPrediction } from "@/lib/risk/types";
import { FactorBreakdown } from "./FactorBreakdown";

const STATUS_LABEL: Record<string, string> = {
  live: "Live API",
  demo: "Demonstration input",
  "source-derived": "Source-derived",
  prototype: "Prototype value",
  unavailable: "Not available in prototype",
};

export function RiskScoreCard({ prediction }: { prediction: RiskPrediction }) {
  const a = prediction.assessment;
  const loc = prediction.location;

  return (
    <section aria-label="Risk assessment result" className="space-y-4">
      <div className="space-y-3 rounded-lg border border-panel-border bg-panel p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Estimated landslide risk
            </p>
            <p className="font-display text-3xl font-semibold leading-none">
              {a.risk_score}
              <span className="text-base font-normal text-muted-foreground"> / 100</span>
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white ${LEVEL_TOKEN[a.risk_level]}`}
          >
            {a.risk_level}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{a.summary}</p>
        <p className="text-xs text-muted-foreground">
          {loc.district ?? "Outside mapped districts"} · {loc.latitude.toFixed(4)},{" "}
          {loc.longitude.toFixed(4)}
        </p>
        <p className="flex items-start gap-1.5 rounded-md bg-secondary/70 p-2 text-[0.7rem] leading-snug text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Risk engine: {a.model_label} ({a.model_type}). Model-derived prototype risk assessment for
          decision-support — it does not predict whether or when a landslide will occur.
        </p>
      </div>

      <section aria-label="Why this risk level" className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Why?
        </h3>
        <ol className="space-y-1.5">
          {a.explanation.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug">
              <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{i + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      </section>

      <FactorBreakdown factors={a.factors} />

      <p className="flex items-start gap-1.5 rounded-md border border-panel-border bg-secondary/60 p-2.5 text-xs leading-snug">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-hazard" aria-hidden />
        {a.monitoring}
      </p>

      <section aria-label="Data sources" className="space-y-1.5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Database className="size-3.5" aria-hidden /> Data sources
        </h3>
        <dl className="space-y-1.5">
          {a.factors.map((f) => (
            <div key={f.key} className="flex gap-2 text-xs">
              <dt className="w-24 shrink-0 font-semibold uppercase tracking-wide text-muted-foreground">
                {f.label}
              </dt>
              <dd>
                {STATUS_LABEL[
                  prediction.data_status[f.key === "historical" ? "historical" : f.key] ??
                    "unavailable"
                ]}
              </dd>
            </div>
          ))}
        </dl>
        <ul className="space-y-1 pt-1">
          {prediction.data_status.sources.map((s) => (
            <li key={s.label} className="text-[0.7rem] leading-snug text-muted-foreground">
              <span className="font-semibold">{s.label}:</span> {s.value}
            </li>
          ))}
        </ul>
        <p className="text-[0.7rem] text-muted-foreground">
          Scenario: {prediction.scenario} · assessed {prediction.generated_at.slice(0, 16).replace("T", " ")} UTC
        </p>
      </section>
    </section>
  );
}
