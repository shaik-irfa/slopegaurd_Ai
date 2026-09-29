import { ShieldCheck } from "lucide-react";
import type { ResponseRecommendation } from "@/lib/decision/recommendation";

const CATEGORY_STYLE: Record<ResponseRecommendation["category"], string> = {
  "NO ALERT": "bg-risk-low/15 text-risk-low ring-risk-low/40",
  MONITOR: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/40",
  WARNING: "bg-risk-high/15 text-risk-high ring-risk-high/40",
  URGENT: "bg-risk-critical/15 text-risk-critical ring-risk-critical/40",
};

export function RecommendedAction({ recommendation }: { recommendation: ResponseRecommendation }) {
  return (
    <section aria-label="Recommended response" className="space-y-2.5">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <ShieldCheck className="size-3.5" aria-hidden /> Recommended response
      </h2>
      <div className="rounded-lg border border-panel-border bg-secondary/50 p-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ring-1 ${
            CATEGORY_STYLE[recommendation.category]
          }`}
        >
          {recommendation.category_label}
        </span>
        <p className="mt-2 text-sm font-semibold leading-snug">{recommendation.action}</p>
        {recommendation.notes.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {recommendation.notes.map((note) => (
              <li key={note} className="text-xs leading-relaxed text-muted-foreground">
                • {note}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2.5 border-t border-panel-border pt-2 text-[0.7rem] leading-relaxed text-muted-foreground">
          {recommendation.disclaimer}
        </p>
      </div>
    </section>
  );
}
