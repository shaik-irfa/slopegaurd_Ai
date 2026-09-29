import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { DistrictFeature } from "@/types/gis";

interface Props {
  districts: DistrictFeature[];
  onSelectDistrict: (feature: DistrictFeature) => void;
  onSelectPlace: (place: { name: string; lat: number; lon: number }) => void;
}

interface PlaceResult {
  name: string;
  lat: number;
  lon: number;
}

export function LocationSearch({ districts, onSelectDistrict, onSelectPlace }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [geocodeError, setGeocodeError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const districtMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return districts.filter((d) => d.properties.name.toLowerCase().includes(q)).slice(0, 6);
  }, [districts, query]);

  // Optional enrichment via the free OpenStreetMap Nominatim geocoder.
  // The app stays fully usable if this request fails (no paid API dependency).
  function scheduleGeocode(value: string) {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setPlaces([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(
          `${value}, Meghalaya`,
        )}`;
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error("geocode failed");
        const json = (await res.json()) as { display_name: string; lat: string; lon: string }[];
        setPlaces(
          json.map((p) => ({
            name: p.display_name,
            lat: Number(p.lat),
            lon: Number(p.lon),
          })),
        );
        setGeocodeError(false);
      } catch {
        setPlaces([]);
        setGeocodeError(true);
      }
    }, 450);
  }

  const hasResults = districtMatches.length > 0 || places.length > 0;

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-lg border border-panel-border bg-panel px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            scheduleGeocode(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search district or place (e.g. Shillong)"
          aria-label="Search location"
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setPlaces([]);
            }}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {open && query.trim().length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[1200] max-h-72 overflow-y-auto panel-surface p-1.5">
          {districtMatches.length > 0 ? (
            <>
              <p className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Districts — Meghalaya GIS
              </p>
              {districtMatches.map((d) => (
                <button
                  key={d.properties.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelectDistrict(d);
                    setQuery(d.properties.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left text-sm hover:bg-secondary"
                >
                  <span className="font-medium">{d.properties.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.properties.landslideCount ?? 0} records
                  </span>
                </button>
              ))}
            </>
          ) : null}

          {places.length > 0 ? (
            <>
              <p className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Places — OpenStreetMap
              </p>
              {places.map((p) => (
                <button
                  key={`${p.lat}-${p.lon}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelectPlace(p);
                    setQuery(p.name.split(",")[0] ?? p.name);
                    setOpen(false);
                  }}
                  className="block w-full truncate rounded-md px-2 py-2.5 text-left text-sm hover:bg-secondary"
                >
                  {p.name}
                </button>
              ))}
            </>
          ) : null}

          {!hasResults ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {geocodeError
                ? "Place search temporarily unavailable. District search still works."
                : "No matching district found."}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
