import { Layers } from "lucide-react";
import type { LayerState } from "@/types/gis";

interface Props {
  layers: LayerState;
  onToggle: (key: keyof LayerState) => void;
}

const IMPLEMENTED: { key: keyof LayerState; label: string; note?: string }[] = [
  { key: "riskGrid", label: "Risk Grid (model-derived)", note: "Risk engine" },
  { key: "districts", label: "District Boundaries", note: "Meghalaya GIS" },
  { key: "landslides", label: "Landslide Locations", note: "Meghalaya GIS" },
  { key: "assets", label: "Nearby Assets", note: "OpenStreetMap" },
  { key: "reports", label: "Field Reports", note: "Prototype" },
  { key: "terrain", label: "Terrain (OpenTopoMap)" },
  { key: "satellite", label: "Satellite Basemap" },
];

const PLANNED: { key: string; label: string }[] = [];

export function LayerPanel({ layers, onToggle }: Props) {
  return (
    <section aria-label="Map layers" className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Layers className="size-3.5" aria-hidden /> Map layers
      </h2>
      <ul className="space-y-1.5">
        {IMPLEMENTED.map(({ key, label, note }) => (
          <li key={key}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => onToggle(key)}
                className="size-4 accent-primary"
              />
              <span className="text-sm font-medium">{label}</span>
              {note ? (
                <span className="ml-auto text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  {note}
                </span>
              ) : null}
            </label>
          </li>
        ))}
        {PLANNED.map(({ key, label }) => (
          <li key={key}>
            <div className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 opacity-60">
              <input type="checkbox" disabled className="size-4" />
              <span className="text-sm">{label}</span>
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Phase 2
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
