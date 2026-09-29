import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { ExposurePanel } from "@/components/decision/ExposurePanel";
import { RecommendedAction } from "@/components/decision/RecommendedAction";
import { ReportList } from "@/components/reports/ReportList";
import { alertQuery, exposureQuery, reportsQuery, updateAlertStatus } from "@/services/decisionApi";
import { recommendResponse } from "@/lib/decision/recommendation";
import { LEVEL_TOKEN } from "@/lib/risk/level-style";
import { haversineKm } from "@/lib/geo";

export const Route = createFileRoute("/alerts/$alertId")({
  head: () => ({
    meta: [
      { title: "Alert detail — SLOPEGUARD AI prototype" },
      {
        name: "description",
        content:
          "Complete prototype risk detail for one demonstration alert: model-derived score, reasons, nearby mapped assets, recommended prototype response and field reports.",
      },
      { property: "og:title", content: "Alert detail — SLOPEGUARD AI prototype" },
      {
        property: "og:description",
        content:
          "Model-derived landslide risk detail with factor reasoning, exposure and recommended prototype response.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AlertDetail,
  errorComponent: ({ error }) => (
    <div className="p-6" role="alert">
      <p className="text-sm text-hazard">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">This alert could not be found.</div>,
});

function AlertDetail() {
  const { alertId } = Route.useParams();
  const queryClient = useQueryClient();
  const alertRes = useQuery(alertQuery(alertId));
  const alert = alertRes.data ?? null;
  const exposure = useQuery(
    exposureQuery(alert?.latitude ?? null, alert?.longitude ?? null, 3, !!alert),
  );
  const reports = useQuery(reportsQuery());

  const status = useMutation({
    mutationFn: (action: "acknowledge" | "resolve") => updateAlertStatus(alertId, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alert", alertId] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const nearbyReports = alert
    ? (reports.data ?? []).filter(
        (r) => haversineKm(alert.latitude, alert.longitude, r.latitude, r.longitude) <= 5,
      )
    : [];

  const recommendation = alert
    ? recommendResponse(alert.risk_level, {
        exposedAssetTypes: (exposure.data?.assets ?? []).map((a) => a.type),
        nearbyReports: nearbyReports.length,
      })
    : null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-panel-border bg-panel/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 md:flex-row md:items-center">
          <Link
            to="/alerts"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back to alerts
          </Link>
          <AppNav className="md:ml-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-5 md:px-6">
        {alertRes.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading alert…
          </p>
        ) : alertRes.isError || !alert ? (
          <p className="text-sm text-hazard">
            This alert could not be loaded. Nothing is substituted.
          </p>
        ) : (
          <>
            <section className="space-y-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white ${
                  LEVEL_TOKEN[alert.risk_level]
                }`}
              >
                {alert.risk_level} · {alert.risk_score}/100 model-derived
              </span>
              <h1 className="text-xl font-bold">{alert.location_name}</h1>
              <p className="text-xs text-muted-foreground">
                Created {new Date(alert.created_at).toLocaleString()} · status {alert.status}
                {alert.scenario ? ` · ${alert.scenario}` : ""}
                {alert.rainfall_mm !== null ? ` · rainfall input ${alert.rainfall_mm} mm` : ""}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Estimated landslide risk from the prototype weighted risk model. This is
                decision support, not a deterministic prediction, an official warning or a statement
                about when a landslide will occur.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {alert.status === "active" ? (
                  <button
                    type="button"
                    disabled={status.isPending}
                    onClick={() => status.mutate("acknowledge")}
                    className="min-h-11 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Acknowledge
                  </button>
                ) : null}
                {alert.status !== "resolved" ? (
                  <button
                    type="button"
                    disabled={status.isPending}
                    onClick={() => status.mutate("resolve")}
                    className="min-h-11 rounded-md border border-panel-border px-3 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    Mark resolved
                  </button>
                ) : null}
                <Link
                  to="/"
                  search={{ lat: alert.latitude, lon: alert.longitude }}
                  className="inline-flex min-h-11 items-center rounded-md border border-panel-border px-3 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  Open on map
                </Link>
              </div>
            </section>

            <section aria-label="Why this risk level" className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Why this risk level
              </h2>
              {alert.reasons.length > 0 ? (
                <ul className="space-y-1.5">
                  {alert.reasons.map((r) => (
                    <li key={r} className="text-sm leading-relaxed">
                      • {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Factor reasoning was not stored for this alert.
                </p>
              )}
            </section>

            <ExposurePanel
              exposure={exposure.data ?? null}
              loading={exposure.isLoading}
              error={exposure.isError}
              radiusKm={3}
            />

            {recommendation ? <RecommendedAction recommendation={recommendation} /> : null}

            <section aria-label="Field reports near this alert" className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Field reports within 5 km
              </h2>
              <p className="text-xs text-muted-foreground">
                Ground-verification evidence. Reports do not change the model-derived score.
              </p>
              <ReportList
                reports={nearbyReports}
                loading={reports.isLoading}
                error={reports.isError}
              />
            </section>

            <section aria-label="Data sources" className="rounded-lg border border-panel-border bg-secondary/50 p-3">
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Data sources
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Meghalaya Government GIS (district boundaries, MBDA landslide records), Copernicus
                DEM elevation via Open-Meteo, Open-Meteo precipitation, and OpenStreetMap for nearby
                assets. Prototype weighted risk model — student project, no official authority.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
