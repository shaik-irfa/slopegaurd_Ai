import { useId } from "react";
import type { DistrictFeature } from "@/types/gis";

interface Props {
  districts: DistrictFeature[];
  landslideCount: number;
  selectedDistrictId: string | null;
  onSelectDistrict: (feature: DistrictFeature | null) => void;
  loading: boolean;
}

export function RegionSummary({
  districts,
  landslideCount,
  selectedDistrictId,
  onSelectDistrict,
  loading,
}: Props) {
  const selectId = useId();
  return (
    <section aria-label="Region" className="space-y-3">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
          Region
        </p>
        <h2 className="text-lg font-semibold leading-tight">Meghalaya, North Eastern Region</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-secondary/70 p-2.5">
          <p className="text-xl font-bold tabular-nums">{loading ? "—" : districts.length}</p>
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Districts</p>
        </div>
        <div className="rounded-lg bg-secondary/70 p-2.5">
          <p className="text-xl font-bold tabular-nums">
            {loading ? "—" : landslideCount.toLocaleString("en-IN")}
          </p>
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            Landslide records
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={selectId}
          className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          District
        </label>
        <select
          id={selectId}
          value={selectedDistrictId ?? ""}
          onChange={(e) => {
            const found = districts.find((d) => d.properties.id === e.target.value) ?? null;
            onSelectDistrict(found);
          }}
          className="h-11 w-full rounded-lg border border-panel-border bg-panel px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">All districts (whole state)</option>
          {districts.map((d) => (
            <option key={d.properties.id} value={d.properties.id}>
              {d.properties.name}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
