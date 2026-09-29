import { CloudRain, Loader2, Play } from "lucide-react";
import { RISK_CONFIG } from "@/lib/risk/risk-model";

const PRESETS = [
  { key: "normal", label: "Normal", mm: RISK_CONFIG.rainfallScenarios.normal },
  { key: "heavy", label: "Heavy rain", mm: RISK_CONFIG.rainfallScenarios.heavy },
  { key: "extreme", label: "Extreme rain", mm: RISK_CONFIG.rainfallScenarios.extreme },
];

interface Props {
  rainfall: number;
  onRainfallChange: (mm: number) => void;
  useLive: boolean;
  onUseLiveChange: (v: boolean) => void;
  includeForecast: boolean;
  onIncludeForecastChange: (v: boolean) => void;
  onAssess: () => void;
  busy: boolean;
  hasLocation: boolean;
  liveActive: boolean;
}

export function RainfallScenario({
  rainfall,
  onRainfallChange,
  useLive,
  onUseLiveChange,
  includeForecast,
  onIncludeForecastChange,
  onAssess,
  busy,
  hasLocation,
  liveActive,
}: Props) {
  return (
    <section aria-label="Rainfall scenario" className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <CloudRain className="size-3.5" aria-hidden /> Rainfall scenario
      </h2>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 py-1.5">
        <input
          type="checkbox"
          checked={useLive}
          onChange={(e) => onUseLiveChange(e.target.checked)}
          className="size-4 accent-primary"
        />
        <span className="text-sm font-medium">Use live rainfall</span>
        <span className="ml-auto text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {useLive ? (liveActive ? "Live API" : "Trying live…") : "Demo mode"}
        </span>
      </label>

      <div className={useLive ? "pointer-events-none space-y-3 opacity-50" : "space-y-3"}>
        <div className="flex items-baseline justify-between">
          <label htmlFor="rainfall-mm" className="text-sm font-medium">
            Demonstration rainfall
          </label>
          <span className="font-display text-lg font-semibold">{rainfall} mm</span>
        </div>
        <input
          id="rainfall-mm"
          type="range"
          min={0}
          max={300}
          step={5}
          value={rainfall}
          onChange={(e) => onRainfallChange(Number(e.target.value))}
          className="h-6 w-full accent-primary"
        />
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onRainfallChange(p.mm)}
              className={`min-h-11 rounded-lg border px-2 text-xs font-semibold transition-colors ${
                rainfall === p.mm
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-panel-border bg-secondary/60 hover:bg-secondary"
              }`}
            >
              {p.label}
              <span className="block text-[0.65rem] font-normal opacity-80">{p.mm} mm</span>
            </button>
          ))}
        </div>
        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          Demonstration scenario values — these are not live rainfall observations. They show how
          changing conditions affect the model-derived risk.
        </p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 py-1.5">
        <input
          type="checkbox"
          checked={includeForecast}
          onChange={(e) => onIncludeForecastChange(e.target.checked)}
          disabled={!useLive}
          className="size-4 accent-primary disabled:opacity-50"
        />
        <span className={`text-sm ${useLive ? "font-medium" : "text-muted-foreground"}`}>
          Include next-24h forecast rainfall
        </span>
      </label>

      <button
        type="button"
        onClick={onAssess}
        disabled={busy || !hasLocation}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-hazard px-4 text-sm font-bold uppercase tracking-wide text-hazard-foreground transition-colors hover:bg-hazard/90 disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Assessing…
          </>
        ) : (
          <>
            <Play className="size-4" aria-hidden /> Assess risk
          </>
        )}
      </button>
      {!hasLocation ? (
        <p className="text-xs text-muted-foreground">
          Tap a place on the map, or pick a district, to choose the location to assess.
        </p>
      ) : null}
    </section>
  );
}
