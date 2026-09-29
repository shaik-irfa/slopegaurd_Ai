import { queryOptions } from "@tanstack/react-query";
import type { RiskGridResponse, RiskPrediction } from "@/lib/risk/types";

export interface PredictRequest {
  latitude: number;
  longitude: number;
  rainfall?: number;
  slope?: number;
  scenario?: string;
  useLiveWeather?: boolean;
  includeForecast?: boolean;
}

export async function predictRisk(body: PredictRequest): Promise<RiskPrediction> {
  const res = await fetch("/api/risk/predict", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Risk assessment failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as RiskPrediction;
}

export function riskGridQuery(rainfallMm: number, live: boolean, scenario: string) {
  return queryOptions({
    queryKey: ["risk", "grid", live ? "live" : rainfallMm],
    queryFn: async () => {
      const params = new URLSearchParams({
        rainfall: String(rainfallMm),
        scenario,
        live: String(live),
      });
      const res = await fetch(`/api/risk/grid?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Risk grid failed (${res.status})`);
      return (await res.json()) as RiskGridResponse;
    },
    staleTime: 1000 * 60 * 5,
  });
}
