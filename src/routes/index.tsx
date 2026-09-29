import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  ClipboardList,
  Crosshair,
  Database,
  Gauge,
  Layers,
  Loader2,
  PlayCircle,
  ScrollText,
  ShieldCheck,
  X,
} from "lucide-react";
import { districtsQuery, landslidesQuery } from "@/services/gisApi";
import { predictRisk, riskGridQuery } from "@/services/riskApi";
import { createAlert, exposureQuery, reportsQuery } from "@/services/decisionApi";
import { MapPanel } from "@/components/map/MapPanel";
import type { AssessedPoint } from "@/components/map/MeghalayaMap";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { RegionSummary } from "@/components/layout/RegionSummary";
import { LayerPanel } from "@/components/layers/LayerPanel";
import { MapLegend } from "@/components/layers/MapLegend";
import { DetailsPanel } from "@/components/details/DetailsPanel";
import { RainfallScenario } from "@/components/risk/RainfallScenario";
import { RiskScoreCard } from "@/components/risk/RiskScoreCard";
import { RiskLegend } from "@/components/risk/RiskLegend";
import { RiskOverview } from "@/components/risk/RiskOverview";
import { ExposurePanel } from "@/components/decision/ExposurePanel";
import { RecommendedAction } from "@/components/decision/RecommendedAction";
import { ReportForm } from "@/components/reports/ReportForm";
import { isAlertEligible, recommendResponse } from "@/lib/decision/recommendation";
import { haversineKm } from "@/lib/geo";
import { RISK_CONFIG } from "@/lib/risk/risk-model";
import type { RiskGridCell } from "@/lib/risk/types";
import type {
  BBox,
  DistrictFeature,
  LandslideFeature,
  LayerState,
  SelectedFeature,
} from "@/types/gis";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { lat?: number; lon?: number } => ({
    ...(search["lat"] !== undefined ? { lat: Number(search["lat"]) } : {}),
    ...(search["lon"] !== undefined ? { lon: Number(search["lon"]) } : {}),
  }),
  head: () => ({
    meta: [
      { title: "SLOPEGUARD AI — Meghalaya Landslide Risk Intelligence" },
      {
        name: "description",
        content:
          "Interactive GIS prototype estimating landslide risk across Meghalaya from rainfall, slope, terrain and recorded landslide history. Student decision-support prototype.",
      },
      { property: "og:title", content: "SLOPEGUARD AI — Meghalaya Landslide Risk Intelligence" },
      {
        property: "og:description",
        content:
          "Explore model-derived landslide risk for Meghalaya districts and grid cells, with a full explanation of every factor. Prototype risk assessment, not a live warning system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type MobileTab = "risk" | "action" | "report" | "layers" | "details" | null;

function Index() {
  const districtsRes = useQuery(districtsQuery);
  const landslidesRes = useQuery(landslidesQuery);
  const queryClient = useQueryClient();
  const search = Route.useSearch();

  const [layers, setLayers] = useState<LayerState>({
    districts: true,
    landslides: true,
    riskGrid: true,
    terrain: false,
    satellite: false,
    assets: true,
    reports: true,
  });
  const [selected, setSelected] = useState<SelectedFeature>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [focusBBox, setFocusBBox] = useState<BBox | null>(null);
  const [locateRequestId, setLocateRequestId] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>(null);

  // Risk state
  const [rainfall, setRainfall] = useState<number>(RISK_CONFIG.rainfallScenarios.normal);
  const [useLive, setUseLive] = useState(false);
  const [includeForecast, setIncludeForecast] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [radiusKm, setRadiusKm] = useState(3);
  const [createdAlertId, setCreatedAlertId] = useState<string | null>(null);

  // A location handed over from the alerts or reports pages.
  useEffect(() => {
    if (search.lat === undefined || search.lon === undefined) return;
    if (Number.isNaN(search.lat) || Number.isNaN(search.lon)) return;
    setPoint({ lat: search.lat, lon: search.lon });
    setFocusBBox([search.lon - 0.06, search.lat - 0.05, search.lon + 0.06, search.lat + 0.05]);
  }, [search.lat, search.lon]);

  const gridRes = useQuery(
    riskGridQuery(rainfall, useLive, useLive ? "Live rainfall" : "Demonstration scenario"),
  );

  const prediction = useMutation({
    mutationFn: predictRisk,
    onSuccess: () => setAssessmentCount((n) => n + 1),
  });

  const districts = districtsRes.data?.data ?? null;
  const districtFeatures = districts?.features ?? [];
  const allLandslides = landslidesRes.data?.data.features ?? [];
  const riskCells = gridRes.data?.cells ?? [];

  const visibleLandslides = useMemo(() => {
    if (!selectedDistrictId) return allLandslides;
    const name = districtFeatures
      .find((d) => d.properties.id === selectedDistrictId)
      ?.properties.name.toLowerCase();
    if (!name) return allLandslides;
    return allLandslides.filter((f) => (f.properties.district ?? "").toLowerCase() === name);
  }, [allLandslides, districtFeatures, selectedDistrictId]);

  const result = prediction.data ?? null;
  const assessedPoint: AssessedPoint | null = point
    ? {
        lat: point.lat,
        lon: point.lon,
        level:
          result && result.location.latitude === point.lat && result.location.longitude === point.lon
            ? result.assessment.risk_level
            : null,
        score:
          result && result.location.latitude === point.lat && result.location.longitude === point.lon
            ? result.assessment.risk_score
            : null,
      }
    : null;

  function assess(target?: { lat: number; lon: number }) {
    const p = target ?? point;
    if (!p) return;
    prediction.mutate({
      latitude: p.lat,
      longitude: p.lon,
      rainfall,
      scenario: useLive ? "Live rainfall" : "Demonstration scenario",
      useLiveWeather: useLive,
      includeForecast: useLive && includeForecast,
    });
  }

  function handleMapClick(lat: number, lon: number) {
    setPoint({ lat, lon });
    prediction.reset();
    setMobileTab("risk");
  }

  function handleRiskCell(cell: RiskGridCell) {
    const [lat, lon] = cell.centroid;
    setPoint({ lat, lon });
    setMobileTab("risk");
    assess({ lat, lon });
  }

  function selectDistrict(feature: DistrictFeature | null) {
    if (!feature) {
      setSelectedDistrictId(null);
      setSelected(null);
      setFocusBBox(null);
      return;
    }
    setSelectedDistrictId(feature.properties.id);
    setSelected({ kind: "district", feature });
    setFocusBBox(feature.properties.bbox);
    const [minX, minY, maxX, maxY] = feature.properties.bbox;
    setPoint({ lat: (minY + maxY) / 2, lon: (minX + maxX) / 2 });
    prediction.reset();
  }

  function selectLandslide(feature: LandslideFeature) {
    setSelected({ kind: "landslide", feature });
    const [lon, lat] = feature.geometry.coordinates;
    setPoint({ lat, lon });
    prediction.reset();
    setMobileTab((t) => (t === null ? null : "details"));
  }

  function toggleLayer(key: keyof LayerState) {
    setLayers((prev) => {
      if (key === "satellite") return { ...prev, satellite: !prev.satellite, terrain: false };
      if (key === "terrain") return { ...prev, terrain: !prev.terrain, satellite: false };
      return { ...prev, [key]: !prev[key] };
    });
  }

  const loadFailed = districtsRes.isError && landslidesRes.isError;
  const loading = districtsRes.isLoading || landslidesRes.isLoading;

  // ---- Phase 3: exposure, recommended response, alerts, field reports ----
  const alertEligible = result ? isAlertEligible(result.assessment.risk_level) : false;
  const exposureRes = useQuery(
    exposureQuery(
      result?.location.latitude ?? null,
      result?.location.longitude ?? null,
      radiusKm,
      alertEligible,
    ),
  );
  const reportsRes = useQuery(reportsQuery());
  const allReports = reportsRes.data ?? [];

  const nearbyReports = result
    ? allReports.filter(
        (r) =>
          haversineKm(result.location.latitude, result.location.longitude, r.latitude, r.longitude) <=
          5,
      )
    : [];

  const recommendation = result
    ? recommendResponse(result.assessment.risk_level, {
        exposedAssetTypes: (exposureRes.data?.assets ?? []).map((a) => a.type),
        nearbyReports: nearbyReports.length,
      })
    : null;

  const raiseAlert = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("Assess a location first.");
      return createAlert({
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        location_name: result.location.district
          ? `${result.location.district} (${result.location.latitude.toFixed(3)}, ${result.location.longitude.toFixed(3)})`
          : `${result.location.latitude.toFixed(3)}, ${result.location.longitude.toFixed(3)}`,
        district_id: result.location.districtId,
        risk_score: result.assessment.risk_score,
        risk_level: result.assessment.risk_level,
        reasons: result.assessment.explanation,
        assets: (exposureRes.data?.assets ?? []).map((a) => ({
          type: a.type,
          name: a.name,
          distance_km: a.distance_km,
        })),
        scenario: result.scenario,
        rainfall_mm: result.inputs.rainfallMm,
      });
    },
    onSuccess: (alert) => {
      setCreatedAlertId(alert.id);
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const demoRun = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/demo/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Demonstration run failed (${res.status})`);
      return res.json() as Promise<{ prediction: { location: { latitude: number; longitude: number } } }>;
    },
    onSuccess: (data) => {
      const { latitude, longitude } = data.prediction.location;
      setRainfall(RISK_CONFIG.rainfallScenarios.extreme);
      setUseLive(false);
      setPoint({ lat: latitude, lon: longitude });
      setFocusBBox([longitude - 0.06, latitude - 0.05, longitude + 0.06, latitude + 0.05]);
      assess({ lat: latitude, lon: longitude });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const decisionSection = (
    <div className="space-y-5">
      {!result ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Assess a location first. When the model-derived level reaches HIGH or CRITICAL, this panel
          lists the mapped assets nearby, the prototype recommended response and the option to raise
          a demonstration alert.
        </p>
      ) : (
        <>
          {alertEligible ? (
            <ExposurePanel
              exposure={exposureRes.data ?? null}
              loading={exposureRes.isLoading}
              error={exposureRes.isError}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              onFocusAsset={(lat, lon) =>
                setFocusBBox([lon - 0.02, lat - 0.015, lon + 0.02, lat + 0.015])
              }
            />
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nearby-asset exposure is checked when the model-derived level is HIGH or CRITICAL.
              Current level: {result.assessment.risk_level}.
            </p>
          )}

          {recommendation ? <RecommendedAction recommendation={recommendation} /> : null}

          {alertEligible ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => raiseAlert.mutate()}
                disabled={raiseAlert.isPending}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-hazard px-4 text-sm font-bold uppercase tracking-wide text-hazard-foreground disabled:opacity-60"
              >
                {raiseAlert.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <BellRing className="size-4" aria-hidden />
                )}
                Generate demonstration alert
              </button>
              {createdAlertId ? (
                <Link
                  to="/alerts/$alertId"
                  params={{ alertId: createdAlertId }}
                  className="block text-xs font-semibold text-primary underline"
                >
                  Demonstration alert created — open the full risk detail
                </Link>
              ) : null}
              {raiseAlert.isError ? (
                <p className="text-xs text-hazard">{(raiseAlert.error as Error).message}</p>
              ) : null}
              <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                Creates a record inside this prototype only. No SMS, email or authority notification
                is sent.
              </p>
            </div>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          to="/alerts"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-panel-border px-3 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          <BellRing className="size-3.5" aria-hidden /> Alert dashboard
        </Link>
        <button
          type="button"
          onClick={() => demoRun.mutate()}
          disabled={demoRun.isPending}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-panel-border px-3 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {demoRun.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <PlayCircle className="size-3.5" aria-hidden />
          )}
          Run demo scenario
        </button>
      </div>
      {demoRun.isError ? (
        <p className="text-xs text-hazard">{(demoRun.error as Error).message}</p>
      ) : null}
    </div>
  );

  const reportSection = (
    <div className="space-y-4">
      <ReportForm
        latitude={point?.lat ?? null}
        longitude={point?.lon ?? null}
        districtId={selectedDistrictId}
        onUseMyLocation={() => setLocateRequestId((n) => n + 1)}
      />
      <p className="text-xs text-muted-foreground">
        {reportsRes.isLoading
          ? "Loading field reports…"
          : `${allReports.length} report(s) stored in this prototype · ${nearbyReports.length} within 5 km of the assessed point.`}
      </p>
      <Link
        to="/reports"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-panel-border px-3 text-xs font-semibold transition-colors hover:bg-secondary"
      >
        <ClipboardList className="size-3.5" aria-hidden /> Review all field reports
      </Link>
    </div>
  );


  const riskSection = (
    <div className="space-y-4">
      <RainfallScenario
        rainfall={rainfall}
        onRainfallChange={setRainfall}
        useLive={useLive}
        onUseLiveChange={setUseLive}
        includeForecast={includeForecast}
        onIncludeForecastChange={setIncludeForecast}
        onAssess={() => assess()}
        busy={prediction.isPending}
        hasLocation={!!point}
        liveActive={gridRes.data?.meta.rainfallStatus === "live"}
      />
      {point ? (
        <p className="text-xs text-muted-foreground">
          Selected location: {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
        </p>
      ) : null}
      {prediction.isError ? (
        <p className="rounded-md border border-panel-border bg-secondary/60 p-2.5 text-xs text-hazard">
          The risk assessment could not be completed. Please try again — no substitute values are
          shown.
        </p>
      ) : null}
      {result ? <RiskScoreCard prediction={result} /> : null}
    </div>
  );

  const sidebar = (
    <div className="space-y-6">
      <RegionSummary
        districts={districtFeatures}
        landslideCount={allLandslides.length}
        selectedDistrictId={selectedDistrictId}
        onSelectDistrict={selectDistrict}
        loading={loading}
      />
      <RiskOverview
        grid={gridRes.data ?? null}
        loading={gridRes.isLoading}
        assessmentCount={assessmentCount}
      />
      {riskSection}
      <div className="border-t border-panel-border pt-5">{decisionSection}</div>
      <div className="border-t border-panel-border pt-5">{reportSection}</div>
      <LayerPanel layers={layers} onToggle={toggleLayer} />
      <DetailsPanel
        selected={selected}
        onExploreDistrict={(id) => {
          const found = districtFeatures.find((d) => d.properties.id === id);
          if (found) setFocusBBox([...found.properties.bbox] as BBox);
        }}
      />
      <MapLegend />
      <section className="space-y-1.5 rounded-lg border border-panel-border bg-secondary/50 p-3">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
          <Database className="size-3.5" aria-hidden /> Geographic data
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Meghalaya Government GIS (District_Boundary_2021, MBDA landslide layer), Copernicus DEM
          elevation via Open-Meteo, and public geospatial basemaps (OpenStreetMap, OpenTopoMap, Esri
          imagery). Risk scores come from the prototype weighted risk model — a research
          decision-support prototype, not a live emergency warning system.
        </p>
      </section>
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <AppHeader
        districts={districtFeatures}
        onSelectDistrict={selectDistrict}
        onSelectPlace={(place) => {
          setFocusBBox([place.lon - 0.06, place.lat - 0.05, place.lon + 0.06, place.lat + 0.05]);
          setPoint({ lat: place.lat, lon: place.lon });
          prediction.reset();
        }}
        onLocate={() => setLocateRequestId((n) => n + 1)}
      />
      <div className="border-b border-panel-border bg-panel px-4 md:px-6">
        <AppNav className="overflow-x-auto" />
      </div>


      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[22rem] shrink-0 overflow-y-auto border-r border-panel-border bg-panel p-4 md:block lg:w-[24rem]">
          {sidebar}
        </aside>

        <main className="relative min-h-0 flex-1">
          <MapPanel
            districts={districts}
            landslides={visibleLandslides}
            layers={layers}
            selectedDistrictId={selectedDistrictId}
            focusBBox={focusBBox}
            onSelectDistrict={(f) => selectDistrict(f)}
            onSelectLandslide={selectLandslide}
            locateRequestId={locateRequestId}
            riskCells={riskCells}
            assets={exposureRes.data?.assets ?? []}
            reports={allReports}
            assessedPoint={assessedPoint}
            onMapClick={handleMapClick}
            onSelectRiskCell={handleRiskCell}
            error={loadFailed}
          />

          {districtsRes.isError !== landslidesRes.isError ? (
            <p className="pointer-events-none absolute left-1/2 top-3 z-[900] -translate-x-1/2 rounded-full bg-panel px-3 py-1.5 text-xs font-medium text-hazard shadow-panel">
              Part of the GIS data is temporarily unavailable.
            </p>
          ) : null}

          <div className="absolute bottom-4 left-3 z-[900] hidden md:block">
            <RiskLegend />
          </div>
          <div className="absolute left-2 top-2 z-[900] md:hidden">
            <RiskLegend compact />
          </div>

          <button
            type="button"
            onClick={() => setLocateRequestId((n) => n + 1)}
            aria-label="Go to my location"
            className="absolute bottom-4 right-3 z-[900] grid size-12 place-items-center rounded-full bg-panel text-primary shadow-panel md:hidden"
          >
            <Crosshair className="size-5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileTab("risk");
              if (point) assess();
            }}
            className="absolute bottom-4 left-1/2 z-[900] inline-flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-hazard px-5 text-sm font-bold uppercase tracking-wide text-hazard-foreground shadow-panel md:hidden"
          >
            <Gauge className="size-4" aria-hidden />
            {prediction.isPending ? "Assessing…" : "Assess risk"}
          </button>
        </main>
      </div>

      {/* Mobile bottom sheet */}
      {mobileTab ? (
        <div className="fixed inset-x-0 bottom-14 top-[44%] z-[1300] flex flex-col md:hidden">
          <div className="mx-2 flex min-h-0 flex-1 flex-col overflow-hidden panel-surface">
            <div className="flex items-center justify-between border-b border-panel-border px-4 py-2.5">
              <p className="text-sm font-semibold capitalize">{mobileTab}</p>
              <button
                type="button"
                aria-label="Close panel"
                onClick={() => setMobileTab(null)}
                className="grid size-9 place-items-center rounded-md hover:bg-secondary"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
              {mobileTab === "risk" ? (
                <>
                  <RiskOverview
                    grid={gridRes.data ?? null}
                    loading={gridRes.isLoading}
                    assessmentCount={assessmentCount}
                  />
                  {riskSection}
                </>
              ) : null}
              {mobileTab === "layers" ? (
                <>
                  <RegionSummary
                    districts={districtFeatures}
                    landslideCount={allLandslides.length}
                    selectedDistrictId={selectedDistrictId}
                    onSelectDistrict={(f) => {
                      selectDistrict(f);
                      setMobileTab(null);
                    }}
                    loading={loading}
                  />
                  <LayerPanel layers={layers} onToggle={toggleLayer} />
                </>
              ) : null}
              {mobileTab === "action" ? decisionSection : null}
              {mobileTab === "report" ? reportSection : null}
              {mobileTab === "layers" ? <MapLegend /> : null}
              {mobileTab === "details" ? (
                <DetailsPanel
                  selected={selected}
                  onExploreDistrict={(id) => {
                    const found = districtFeatures.find((d) => d.properties.id === id);
                    if (found) setFocusBBox([...found.properties.bbox] as BBox);
                    setMobileTab(null);
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Prototype workflow"
        className="z-[1400] grid grid-cols-5 border-t border-panel-border bg-panel md:hidden"
      >
        {[
          { key: "risk" as const, label: "Risk", Icon: Gauge },
          { key: "action" as const, label: "Action", Icon: ShieldCheck },
          { key: "report" as const, label: "Report", Icon: ClipboardList },
          { key: "layers" as const, label: "Layers", Icon: Layers },
          { key: "details" as const, label: "Details", Icon: ScrollText },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMobileTab((t) => (t === key ? null : key))}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold ${
              mobileTab === key ? "bg-secondary text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
