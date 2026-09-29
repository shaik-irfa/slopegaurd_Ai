import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { ReportForm } from "@/components/reports/ReportForm";
import { ReportList } from "@/components/reports/ReportList";
import { reportsQuery, updateReportStatus } from "@/services/decisionApi";
import type { ReportStatus } from "@/lib/decision/types";

export const Route = createFileRoute("/reports")({
  validateSearch: (search: Record<string, unknown>): { lat?: number; lon?: number } => ({
    ...(search["lat"] !== undefined ? { lat: Number(search["lat"]) } : {}),
    ...(search["lon"] !== undefined ? { lon: Number(search["lon"]) } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Field Verification Reports — SLOPEGUARD AI" },
      {
        name: "description",
        content:
          "Submit and review prototype field verification reports for Meghalaya slopes: cracks, rockfall, slope movement, blocked roads and water seepage.",
      },
      { property: "og:title", content: "Field Verification Reports — SLOPEGUARD AI" },
      {
        property: "og:description",
        content:
          "Ground-verification reports for the SLOPEGUARD AI landslide decision-support prototype. Reports never change the model-derived risk score.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { lat, lon } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reports = useQuery(reportsQuery());

  const status = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ReportStatus }) => updateReportStatus(id, next),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });

  const pending = (reports.data ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-panel-border bg-panel/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
              <ClipboardList className="size-5 text-primary" aria-hidden /> Field reports
            </h1>
            <p className="text-xs text-muted-foreground">
              {reports.isLoading
                ? "Loading…"
                : `${reports.data?.length ?? 0} report(s) · ${pending} pending verification`}
            </p>
          </div>
          <AppNav className="md:ml-auto" />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-5 md:grid-cols-[22rem_1fr] md:px-6">
        <div className="rounded-lg border border-panel-border bg-panel p-4">
          <ReportForm
            latitude={lat ?? null}
            longitude={lon ?? null}
            onUseMyLocation={() => {
              if (typeof navigator === "undefined" || !navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition((pos) => {
                void navigate({
                  to: "/reports",
                  search: { lat: pos.coords.latitude, lon: pos.coords.longitude },
                });
              });
            }}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Submitted reports
          </h2>
          <ReportList
            reports={reports.data ?? []}
            loading={reports.isLoading}
            error={reports.isError}
            busy={status.isPending}
            onSetStatus={(id, next) => status.mutate({ id, next })}
            onFocus={(rLat, rLon) => void navigate({ to: "/", search: { lat: rLat, lon: rLon } })}
          />
        </div>
      </main>
    </div>
  );
}
