/**
 * Terrain service (server-side).
 *
 * Slope and local relief are derived from public DEM elevation samples served
 * by the Open-Meteo Elevation API (Copernicus DEM GLO-90, free, no API key).
 * For each location the elevation is sampled at the centre and at four
 * neighbours ~550 m away; slope is the steepest gradient between opposite
 * neighbours, relief is the sampled max-min difference.
 *
 * If the DEM request fails, values are reported as unavailable — no random or
 * invented terrain numbers are produced. Results are cached in memory so the
 * same location always returns the same baseline values.
 */

const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const OFFSET_DEG = 0.005; // ~550 m, matched to the 90 m DEM
const KM_PER_DEG_LAT = 111.32;

export interface TerrainSample {
  slopeDeg: number | null;
  reliefM: number | null;
  elevationM: number | null;
  status: "dem" | "unavailable";
  source: string;
}

export const TERRAIN_SOURCE =
  "Open-Meteo Elevation API (Copernicus DEM GLO-90) — derived slope and relief";

const cache = new Map<string, TerrainSample>();
const key = (lat: number, lon: number) => `${lat.toFixed(3)},${lon.toFixed(3)}`;

function unavailable(): TerrainSample {
  return {
    slopeDeg: null,
    reliefM: null,
    elevationM: null,
    status: "unavailable",
    source: TERRAIN_SOURCE,
  };
}

async function fetchElevations(points: [number, number][]): Promise<(number | null)[]> {
  const out: (number | null)[] = [];
  for (let i = 0; i < points.length; i += 100) {
    const batch = points.slice(i, i + 100);
    const url = `${ELEVATION_URL}?latitude=${batch.map((p) => p[0].toFixed(4)).join(",")}&longitude=${batch
      .map((p) => p[1].toFixed(4))
      .join(",")}`;
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`elevation ${res.status}`);
      const json = (await res.json()) as { elevation?: number[] };
      const values = json.elevation ?? [];
      for (let j = 0; j < batch.length; j++) {
        const v = values[j];
        out.push(typeof v === "number" ? v : null);
      }
    } catch {
      for (let j = 0; j < batch.length; j++) out.push(null);
    }
  }
  return out;
}

function computeSample(e: (number | null)[], lat: number): TerrainSample {
  const [c, n, s, w, eastV] = e;
  if (c == null || n == null || s == null || w == null || eastV == null) return unavailable();
  const dLatKm = 2 * OFFSET_DEG * KM_PER_DEG_LAT;
  const dLonKm = 2 * OFFSET_DEG * KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const gradNS = Math.abs(n - s) / (dLatKm * 1000);
  const gradEW = Math.abs(eastV - w) / (dLonKm * 1000);
  const slopeDeg = (Math.atan(Math.hypot(gradNS, gradEW)) * 180) / Math.PI;
  const values = [c, n, s, w, eastV];
  return {
    slopeDeg: Number(slopeDeg.toFixed(2)),
    reliefM: Math.max(...values) - Math.min(...values),
    elevationM: c,
    status: "dem",
    source: TERRAIN_SOURCE,
  };
}

/** Terrain for a batch of points (used by the risk grid). Order is preserved. */
export async function getTerrainBatch(points: [number, number][]): Promise<TerrainSample[]> {
  const pending: { index: number; lat: number; lon: number }[] = [];
  const results: TerrainSample[] = points.map((p, index) => {
    const cached = cache.get(key(p[0], p[1]));
    if (cached) return cached;
    pending.push({ index, lat: p[0], lon: p[1] });
    return unavailable();
  });
  if (!pending.length) return results;

  const query: [number, number][] = [];
  for (const p of pending) {
    query.push([p.lat, p.lon]);
    query.push([p.lat + OFFSET_DEG, p.lon]);
    query.push([p.lat - OFFSET_DEG, p.lon]);
    query.push([p.lat, p.lon - OFFSET_DEG]);
    query.push([p.lat, p.lon + OFFSET_DEG]);
  }
  const elevations = await fetchElevations(query);
  pending.forEach((p, i) => {
    const sample = computeSample(elevations.slice(i * 5, i * 5 + 5), p.lat);
    if (sample.status === "dem") cache.set(key(p.lat, p.lon), sample);
    results[p.index] = sample;
  });
  return results;
}

export async function getTerrain(lat: number, lon: number): Promise<TerrainSample> {
  const [sample] = await getTerrainBatch([[lat, lon]]);
  return sample ?? unavailable();
}
