/**
 * Proximity / infrastructure-exposure service.
 *
 * Assets come from OpenStreetMap via the public Overpass API — real, published
 * geographic data. Nothing is generated: when Overpass is unreachable or
 * returns nothing, the response says so and the UI prints
 * "Asset data unavailable in prototype." instead of inventing assets.
 */
import { haversineKm } from "../geo";
import type { AssetType, ExposureResponse, NearbyAsset } from "./types";

export const INFRA_SOURCE = "OpenStreetMap contributors via Overpass API (live public query)";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const MAX_PER_TYPE = 6;
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: ExposureResponse }>();

function emptyCounts(): Record<AssetType, number> {
  return { road: 0, village: 0, school: 0, hospital: 0, bridge: 0 };
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function classify(tags: Record<string, string>): AssetType | null {
  if (tags["bridge"] === "yes" || tags["man_made"] === "bridge") return "bridge";
  if (tags["amenity"] === "school" || tags["amenity"] === "college") return "school";
  if (tags["amenity"] === "hospital" || tags["amenity"] === "clinic") return "hospital";
  if (tags["place"]) return "village";
  if (tags["highway"]) return "road";
  return null;
}

function buildQuery(lat: number, lon: number, radiusM: number): string {
  const around = `around:${radiusM},${lat},${lon}`;
  return `[out:json][timeout:25];
(
  way(${around})["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential)$"];
  way(${around})["bridge"="yes"];
  node(${around})["place"~"^(city|town|village|hamlet)$"];
  nwr(${around})["amenity"~"^(school|college|hospital|clinic)$"];
);
out tags center 300;`;
}

async function queryOverpass(query: string): Promise<OverpassElement[] | null> {
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "text/plain;charset=UTF-8",
          accept: "application/json",
          "user-agent": "SlopeguardAI-student-prototype/1.0 (SIH26001 Meghalaya)",
        },
        body: query,
      });
      if (!res.ok) {
        console.warn("[slopeguard] overpass rejected query", endpoint, res.status);
        continue;
      }
      const json = (await res.json()) as { elements?: OverpassElement[] };
      if (Array.isArray(json.elements)) return json.elements;
    } catch (error) {
      console.warn("[slopeguard] overpass request failed", endpoint, (error as Error).message);
    }
  }
  return null;
}

export async function findNearbyAssets(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<ExposureResponse> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const elements = await queryOverpass(buildQuery(lat, lon, Math.round(radiusKm * 1000)));

  if (!elements) {
    return {
      meta: {
        status: "unavailable",
        source: INFRA_SOURCE,
        radius_km: radiusKm,
        note: "Asset data unavailable in prototype.",
        message:
          "The public OpenStreetMap query could not be completed. No substitute or invented assets are shown.",
      },
      location: { latitude: lat, longitude: lon },
      counts: emptyCounts(),
      assets: [],
    };
  }

  const byType = new Map<AssetType, NearbyAsset[]>();
  const seen = new Set<string>();

  for (const el of elements) {
    const tags = el.tags ?? {};
    const type = classify(tags);
    if (!type) continue;
    const pLat = el.lat ?? el.center?.lat ?? null;
    const pLon = el.lon ?? el.center?.lon ?? null;
    const name = tags["name"] ?? null;
    const dedupe = `${type}:${name ?? `${el.type}/${el.id}`}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    const asset: NearbyAsset = {
      type,
      name: name ?? `Unnamed ${type} (OpenStreetMap ${el.type} ${el.id})`,
      named: !!name,
      distance_km:
        pLat !== null && pLon !== null
          ? Math.round(haversineKm(lat, lon, pLat, pLon) * 100) / 100
          : null,
      latitude: pLat,
      longitude: pLon,
      source: INFRA_SOURCE,
    };
    const list = byType.get(type) ?? [];
    list.push(asset);
    byType.set(type, list);
  }

  const counts = emptyCounts();
  const assets: NearbyAsset[] = [];
  for (const [type, list] of byType) {
    // Named features first, then nearest; the count reports everything found.
    list.sort((a, b) => {
      if (a.named !== b.named) return a.named ? -1 : 1;
      return (a.distance_km ?? 999) - (b.distance_km ?? 999);
    });
    counts[type] = list.length;
    assets.push(...list.slice(0, MAX_PER_TYPE));
  }
  assets.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));

  const value: ExposureResponse = {
    meta: {
      status: "available",
      source: INFRA_SOURCE,
      radius_km: radiusKm,
      note:
        assets.length > 0
          ? "Exposure detected — these assets are mapped near the assessed point. No damage is implied."
          : "No mapped assets were returned for this radius.",
    },
    location: { latitude: lat, longitude: lon },
    counts,
    assets,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
