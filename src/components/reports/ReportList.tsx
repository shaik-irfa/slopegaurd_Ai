import { Loader2 } from "lucide-react";
import type { ReportRecord, ReportStatus } from "@/lib/decision/types";
import { REPORT_TYPE_LABELS } from "@/lib/decision/types";

const STATUS_STYLE: Record<ReportStatus, string> = {
  pending: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/40",
  verified: "bg-risk-low/15 text-risk-low ring-risk-low/40",
  rejected: "bg-secondary text-muted-foreground ring-panel-border",
};

interface Props {
  reports: ReportRecord[];
  loading?: boolean;
  error?: boolean;
  onFocus?: (lat: number, lon: number) => void;
  onSetStatus?: (id: string, status: ReportStatus) => void;
  busy?: boolean;
}

export function ReportList({ reports, loading, error, onFocus, onSetStatus, busy }: Props) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading field reports…
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-xs text-hazard">
        Field reports could not be loaded right now. Nothing is substituted.
      </p>
    );
  }
  if (reports.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No field reports have been submitted in this prototype yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id} className="space-y-2 rounded-lg border border-panel-border bg-panel p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{REPORT_TYPE_LABELS[r.report_type]}</p>
              <p className="text-[0.7rem] text-muted-foreground">
                {new Date(r.created_at).toLocaleString()} · {r.latitude.toFixed(4)},{" "}
                {r.longitude.toFixed(4)}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ring-1 ${
                STATUS_STYLE[r.status]
              }`}
            >
              {r.status}
            </span>
          </div>
          <p className="text-xs leading-relaxed">{r.description}</p>
          {r.media_url ? (
            <a href={r.media_url} target="_blank" rel="noreferrer" className="block">
              <img
                src={r.media_url}
                alt={`Photo attached to a ${REPORT_TYPE_LABELS[r.report_type].toLowerCase()} field report`}
                loading="lazy"
                className="max-h-40 w-full rounded-md object-cover"
              />
            </a>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {onFocus ? (
              <button
                type="button"
                onClick={() => onFocus(r.latitude, r.longitude)}
                className="min-h-10 rounded-md border border-panel-border px-2.5 text-xs font-semibold transition-colors hover:bg-secondary"
              >
                Show on map
              </button>
            ) : null}
            {onSetStatus && r.status === "pending" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSetStatus(r.id, "verified")}
                  className="min-h-10 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Mark verified
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSetStatus(r.id, "rejected")}
                  className="min-h-10 rounded-md border border-panel-border px-2.5 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  Reject
                </button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
