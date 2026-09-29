import { Building2, Loader2 } from "lucide-react";
import type { ExposureResponse } from "@/lib/decision/types";
import { ASSET_ICONS, ASSET_LABELS } from "@/lib/decision/types";

interface Props {
  exposure: ExposureResponse | null;
  loading?: boolean;
  error?: boolean;
  radiusKm: number;
  onRadiusChange?: (km: number) => void;
  onFocusAsset?: (lat: number, lon: number) => void;
}

const RADII = [1, 3, 5];

/** Impact panel: what mapped public assets sit near the assessed point. */
export function ExposurePanel({
  exposure,
  loading,
  error,
  radiusKm,
  onRadiusChange,
  onFocusAsset,
}: Props) {
  const types = exposure
    ? (Object.keys(exposure.counts) as (keyof typeof ASSET_LABELS)[]).filter(
        (t) => exposure.counts[t] > 0,
      )
    : [];

  return (
    <section aria-label="Infrastructure exposure" className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Building2 className="size-3.5" aria-hidden /> Nearby assets
        </h2>
        {onRadiusChange ? (
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Search radius">
            {RADII.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => onRadiusChange(km)}
                aria-pressed={radiusKm === km}
                className={`min-h-8 rounded-md px-2 text-xs font-semibold ${
                  radiusKm === km
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Querying the public map for
          assets within {radiusKm} km…
        </p>
      ) : null}

      {error || exposure?.meta.status === "unavailable" ? (
        <div className="rounded-lg border border-panel-border bg-secondary/60 p-3">
          <p className="text-sm font-semibold">Asset data unavailable in prototype.</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {exposure?.meta.message ??
              "The public asset query could not be completed. No substitute or invented assets are shown."}
          </p>
        </div>
      ) : null}

      {exposure && exposure.meta.status === "available" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {types.length > 0 ? (
              types.map((t) => (
                <div key={t} className="rounded-lg border border-panel-border bg-secondary/50 p-2.5">
                  <p className="text-lg font-bold leading-none">
                    <span aria-hidden>{ASSET_ICONS[t]}</span> {exposure.counts[t]}
                  </p>
                  <p className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    {ASSET_LABELS[t]}
                  </p>
                </div>
              ))
            ) : (
              <p className="col-span-2 text-xs text-muted-foreground">
                No mapped assets were returned within {radiusKm} km. Nothing is inferred from this.
              </p>
            )}
          </div>

          {exposure.assets.length > 0 ? (
            <ul className="space-y-1.5">
              {exposure.assets.map((a, i) => (
                <li key={`${a.type}-${a.name}-${i}`}>
                  <button
                    type="button"
                    onClick={() =>
                      a.latitude !== null && a.longitude !== null && onFocusAsset
                        ? onFocusAsset(a.latitude, a.longitude)
                        : undefined
                    }
                    disabled={!onFocusAsset || a.latitude === null}
                    className="flex w-full min-h-11 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span aria-hidden>{ASSET_ICONS[a.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.name}</span>
                      <span className="block text-[0.7rem] text-muted-foreground">
                        {ASSET_LABELS[a.type]}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {a.distance_km !== null ? `${a.distance_km.toFixed(2)} km` : "distance n/a"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
            These assets are located near the identified risk area. Damage, casualties and
            population figures are <strong>not</strong> estimated by this prototype. Source:{" "}
            {exposure.meta.source}.
          </p>
        </>
      ) : null}
    </section>
  );
}
