/**
 * Small pure geographic helpers (browser- and server-safe).
 */
import type { AreaGeometry, Position } from "@/types/gis";

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function inRing(lon: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Ray-casting point-in-polygon supporting Polygon and MultiPolygon with holes. */
export function pointInArea(lon: number, lat: number, geometry: AreaGeometry): boolean {
  const polys: Position[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer || !inRing(lon, lat, outer)) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) if (inRing(lon, lat, poly[h]!)) inHole = true;
    if (!inHole) return true;
  }
  return false;
}
