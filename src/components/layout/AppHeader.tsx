import { Crosshair, Mountain } from "lucide-react";
import type { DistrictFeature } from "@/types/gis";
import { LocationSearch } from "@/components/search/LocationSearch";

interface Props {
  districts: DistrictFeature[];
  onSelectDistrict: (feature: DistrictFeature) => void;
  onSelectPlace: (place: { name: string; lat: number; lon: number }) => void;
  onLocate: () => void;
}

export function AppHeader({ districts, onSelectDistrict, onSelectPlace, onLocate }: Props) {
  return (
    <header className="z-[1100] border-b border-panel-border bg-panel/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Mountain className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold uppercase tracking-wide md:text-lg">
              Slopeguard AI
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Meghalaya Landslide Risk Monitor · Predict Before the Slope Fails
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-hazard/12 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-hazard ring-1 ring-hazard/30 md:hidden">
            Prototype
          </span>
        </div>

        <div className="md:ml-auto md:w-80 lg:w-96">
          <LocationSearch
            districts={districts}
            onSelectDistrict={onSelectDistrict}
            onSelectPlace={onSelectPlace}
          />
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            onClick={onLocate}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-panel-border px-3 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <Crosshair className="size-4" aria-hidden /> My location
          </button>
          <span className="rounded-full bg-hazard/12 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-hazard ring-1 ring-hazard/30">
            Prototype — Meghalaya pilot
          </span>
        </div>
      </div>
    </header>
  );
}
