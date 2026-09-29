import { Link } from "@tanstack/react-router";
import { ArrowRight, BellRing } from "lucide-react";
import type { AlertRecord } from "@/lib/decision/types";
import { LEVEL_TOKEN } from "@/lib/risk/level-style";

const STATUS_LABEL: Record<AlertRecord["status"], string> = {
  active: "Active",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

interface Props {
  alert: AlertRecord;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  busy?: boolean;
  compact?: boolean;
}

export function AlertCard({ alert, onAcknowledge, onResolve, busy, compact }: Props) {
  return (
    <article className="space-y-2.5 rounded-lg border border-panel-border bg-panel p-3">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white ${
            LEVEL_TOKEN[alert.risk_level]
          }`}
        >
          <BellRing className="size-3" aria-hidden /> {alert.risk_level}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{alert.location_name}</h3>
          <p className="text-[0.7rem] text-muted-foreground">
            {new Date(alert.created_at).toLocaleString()} · score {alert.risk_score}/100 ·{" "}
            {STATUS_LABEL[alert.status]}
          </p>
        </div>
      </div>

      <p className="text-xs font-medium leading-relaxed">{alert.recommended_action}</p>

      {!compact ? (
        <>
          {alert.reasons.length > 0 ? (
            <ul className="space-y-1">
              {alert.reasons.slice(0, 3).map((r) => (
                <li key={r} className="text-[0.7rem] leading-relaxed text-muted-foreground">
                  • {r}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[0.7rem] text-muted-foreground">
            {alert.assets.length > 0
              ? `${alert.assets.length} mapped asset(s) recorded near this point`
              : "No mapped assets were recorded for this alert"}
            {alert.scenario ? ` · ${alert.scenario}` : ""}
          </p>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/alerts/$alertId"
          params={{ alertId: alert.id }}
          className="inline-flex min-h-10 items-center gap-1 rounded-md border border-panel-border px-2.5 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          Full detail <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        {alert.status === "active" && onAcknowledge ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAcknowledge(alert.id)}
            className="min-h-10 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            Acknowledge
          </button>
        ) : null}
        {alert.status !== "resolved" && onResolve ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve(alert.id)}
            className="min-h-10 rounded-md border border-panel-border px-2.5 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
          >
            Mark resolved
          </button>
        ) : null}
      </div>
      <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
        Demonstration alert — recorded inside this prototype only. No SMS, email or authority
        notification is sent.
      </p>
    </article>
  );
}
