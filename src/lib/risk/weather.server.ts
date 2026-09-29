/**
 * Weather service (server-side).
 *
 * Live rainfall comes from the Open-Meteo Forecast API (free, no API key, no
 * secret to protect). We read observed daily precipitation for the past days
 * and forecast precipitation for the next day.
 *
 * If the request fails the caller falls back to a clearly labelled
 * demonstration rainfall scenario — live values are never invented.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export interface RainfallObservation {
  /** Observed rainfall over the most recent 24 h, mm. */
  rainfall24hMm: number;
  /** Observed rainfall over the most recent 72 h, mm. */
  rainfall72hMm: number;
  /** Forecast rainfall for the next 24 h, mm. */
  forecast24hMm: number | null;
  status: "live";
  source: string;
}

export const WEATHER_SOURCE = "Open-Meteo Forecast API (live observed + forecast precipitation)";

const cache = new Map<string, { at: number; value: RainfallObservation }>();
const TTL_MS = 15 * 60 * 1000;

export async function getLiveRainfall(
  lat: number,
  lon: number,
): Promise<RainfallObservation | null> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const url =
    `${FORECAST_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&daily=precipitation_sum&past_days=3&forecast_days=2&timezone=auto`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { daily?: { precipitation_sum?: (number | null)[] } };
    const series = (json.daily?.precipitation_sum ?? []).map((v) => (typeof v === "number" ? v : 0));
    if (series.length < 4) return null;
    // past_days=3 + today + tomorrow -> [d-3, d-2, d-1, today, tomorrow]
    const today = series[series.length - 2] ?? 0;
    const value: RainfallObservation = {
      rainfall24hMm: Number(today.toFixed(1)),
      rainfall72hMm: Number(
        series
          .slice(Math.max(0, series.length - 4), series.length - 1)
          .reduce((a, b) => a + b, today)
          .toFixed(1),
      ),
      forecast24hMm: Number((series[series.length - 1] ?? 0).toFixed(1)),
      status: "live",
      source: WEATHER_SOURCE,
    };
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}
