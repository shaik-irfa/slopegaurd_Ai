import { Suspense, lazy } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { RiskGridCell } from "@/lib/risk/types";
import type { NearbyAsset, ReportRecord } from "@/lib/decision/types";
import type {
  BBox,
  DistrictCollection,
  DistrictFeature,
  LandslideFeature,
  LayerState,
} from "@/types/gis";
import type { AssessedPoint } from "./MeghalayaMap";

// Leaflet touches `window` at import time, so the map module is only loaded
// in the browser after hydration.
const MeghalayaMap = lazy(() => import("./MeghalayaMap"));

interface Props {
  districts: DistrictCollection | null;
  landslides: LandslideFeature[];
  layers: LayerState;
  selectedDistrictId: string | null;
  focusBBox: BBox | null;
  onSelectDistrict: (feature: DistrictFeature) => void;
  onSelectLandslide: (feature: LandslideFeature) => void;
  locateRequestId: number;
  riskCells: RiskGridCell[];
  assessedPoint: AssessedPoint | null;
  onMapClick: (lat: number, lon: number) => void;
  onSelectRiskCell: (cell: RiskGridCell) => void;
  assets?: NearbyAsset[];
  reports?: ReportRecord[];
  error: boolean;
}

function MapSkeleton({ label }: { label: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-secondary/60">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
      </p>
    </div>
  );
}

export function MapPanel({ error, ...props }: Props) {
  if (error) {
    return (
      <div className="grid h-full w-full place-items-center bg-secondary/60 p-6 text-center">
        <div className="max-w-sm space-y-2">
          <AlertTriangle className="mx-auto size-6 text-hazard" aria-hidden />
          <p className="font-semibold">GIS data temporarily unavailable.</p>
          <p className="text-sm text-muted-foreground">
            The geographic layers could not be loaded. The basemap and controls stay available —
            reload the page to try again. No substitute or simulated data is shown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly fallback={<MapSkeleton label="Preparing map…" />}>
      <Suspense fallback={<MapSkeleton label="Loading Meghalaya GIS map…" />}>
        <MeghalayaMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
