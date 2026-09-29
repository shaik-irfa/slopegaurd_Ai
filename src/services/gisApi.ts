import { queryOptions } from "@tanstack/react-query";
import type { DistrictsResponse, LandslidesResponse } from "@/types/gis";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`GIS request failed (${res.status})`);
  return (await res.json()) as T;
}

export const districtsQuery = queryOptions({
  queryKey: ["gis", "districts"],
  queryFn: () => getJson<DistrictsResponse>("/api/districts"),
  staleTime: 1000 * 60 * 60,
});

export const landslidesQuery = queryOptions({
  queryKey: ["gis", "landslides"],
  queryFn: () => getJson<LandslidesResponse>("/api/landslides"),
  staleTime: 1000 * 60 * 60,
});

export const healthQuery = queryOptions({
  queryKey: ["gis", "health"],
  queryFn: () => getJson<{ status: string; phase: string }>("/api/health"),
  staleTime: 1000 * 60,
});
