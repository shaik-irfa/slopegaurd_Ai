import { AlertTriangle, MapPin, Map as MapIcon, ArrowRight } from "lucide-react";
import type { SelectedFeature } from "@/types/gis";

const NA = "Data not available in prototype";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  const shown =
    value === null || value === undefined || value === "" || value === "NA" ? NA : String(value);
  const missing = shown === NA;
  return (
    <div className="flex gap-3 border-b border-panel-border/70 py-2 last:border-0">
      <dt className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`min-w-0 flex-1 break-words text-sm ${missing ? "text-muted-foreground italic" : ""}`}>
        {shown}
      </dd>
    </div>
  );
}

function formatDate(ms?: number) {
  if (!ms || Number.isNaN(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

interface Props {
  selected: SelectedFeature;
  onExploreDistrict: (id: string) => void;
}

export function DetailsPanel({ selected, onExploreDistrict }: Props) {
  if (!selected) {
    return (
      <section aria-label="Feature details" className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Details
        </h2>
        <p className="text-sm text-muted-foreground">
          Tap a district or a landslide marker on the map to see the information available in the
          source dataset.
        </p>
      </section>
    );
  }

  if (selected.kind === "district") {
    const p = selected.feature.properties;
    return (
      <section aria-label="District details" className="space-y-3">
        <div className="flex items-start gap-2">
          <MapIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              District
            </p>
            <h2 className="text-lg font-semibold leading-tight">{p.name}</h2>
          </div>
        </div>
        <dl>
          <Row label="Landslide records" value={p.landslideCount} />
          <Row
            label="Approx. area"
            value={p.areaKm2 ? `${p.areaKm2.toLocaleString("en-IN")} km² (derived)` : null}
          />
          <Row label="Susceptibility" value={null} />
          <Row label="Data source" value={p.source} />
        </dl>
        <p className="rounded-md bg-secondary/70 p-2 text-xs text-muted-foreground">
          Susceptibility classification (GSI Bhusanket) and model-derived risk scoring are planned
          for Phase 2 and are not computed in this prototype.
        </p>
        <button
          type="button"
          onClick={() => onExploreDistrict(p.id)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Explore district <ArrowRight className="size-4" aria-hidden />
        </button>
      </section>
    );
  }

  const p = selected.feature.properties;
  const [lon, lat] = selected.feature.geometry.coordinates;
  return (
    <section aria-label="Landslide record details" className="space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-hazard" aria-hidden />
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Landslide record
          </p>
          <h2 className="text-lg font-semibold leading-tight">
            {p.landslide_name ?? p.location ?? "Unnamed record"}
          </h2>
        </div>
      </div>
      <dl>
        <Row label="Location" value={p.location} />
        <Row label="District" value={p.district} />
        <Row label="Date of event" value={formatDate(p.date_of_event) ?? p.year} />
        <Row label="Highway affected" value={p.nh_sh_affected} />
        <Row label="Casualties" value={p.casualty} />
        <Row label="24h rainfall (mm)" value={p.rainfall_24hr_mm ? p.rainfall_24hr_mm : null} />
        <Row label="Status" value={p.status} />
        <Row label="Event ID" value={p.slide_id} />
        <Row label="Reported by" value={p.source} />
        <Row label="Coordinates" value={`${lat.toFixed(5)}, ${lon.toFixed(5)}`} />
      </dl>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Fields shown are exactly those present in the Meghalaya GIS landslide dataset; blank fields
        are reported as unavailable.
      </p>
    </section>
  );
}
