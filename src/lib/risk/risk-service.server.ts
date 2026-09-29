/**
 * Risk service (server-side) — glues the GIS data, terrain and weather
 * services to the risk model and produces explainable prototype assessments.
 */
import { getDistricts, getLandslides, DISTRICT_SOURCE, LANDSLIDE_SOURCE } from "../gis-service.server";
import { haversineKm, pointInArea } from "../geo";
import { RISK_CONFIG, riskModel } from "./risk-model";
import { getTerrain, getTerrainBatch, TERRAIN_SOURCE } from "./terrain.server";
import { getLiveRainfall, WEATHER_SOURCE } from "./weather.server";
import type {
  DataStatus,
  RiskDataStatus,
  RiskFactorInputs,
  RiskGridCell,
  RiskGridResponse,
  RiskLocation,
  RiskPrediction,
} from "./types";

const MEGHALAYA_BBOX = { minLat: 24.9, maxLat: 26.2, minLon: 89.7, maxLon: 92.9 };
const GRID_CELL_DEG = 0.1;

export interface PredictInput {
  latitude: number;
  longitude: number;
  /** Rainfall in mm. Omitted -> live rainfall is attempted, then the demo scenario. */
  rainfall?: number | undefined;
  /** Slope in degrees supplied by the caller; otherwise DEM-derived. */
  slope?: number | undefined;
  scenario?: string | undefined;
  useLiveWeather?: boolean | undefined;
  includeForecast?: boolean | undefined;
}

function locateDistrict(lat: number, lon: number): RiskLocation {
  for (const f of getDistricts().features) {
    if (pointInArea(lon, lat, f.geometry))
      return {
        latitude: lat,
        longitude: lon,
        district: f.properties.name,
        districtId: f.properties.id,
      };
  }
  return { latitude: lat, longitude: lon, district: null, districtId: null };
}

/** Landslide records from the Meghalaya GIS snapshot within the configured radius. */
export function historicalNear(lat: number, lon: number) {
  const radiusKm = RISK_CONFIG.normalisation.historical.radiusKm;
  let count = 0;
  let nearest: number | null = null;
  for (const f of getLandslides()) {
    const [fLon, fLat] = f.geometry.coordinates;
    if (Math.abs(fLat - lat) > 0.3 || Math.abs(fLon - lon) > 0.3) continue;
    const d = haversineKm(lat, lon, fLat, fLon);
    if (d <= radiusKm) count += 1;
    if (nearest === null || d < nearest) nearest = d;
  }
  return { count, nearestKm: nearest, radiusKm };
}

function sourcesFor(rainfallStatus: DataStatus, terrainStatus: DataStatus) {
  return [
    {
      label: "Rainfall",
      value: rainfallStatus === "live" ? WEATHER_SOURCE : "Demonstration input (scenario slider)",
    },
    { label: "Historical landslides", value: LANDSLIDE_SOURCE },
    { label: "District boundary", value: DISTRICT_SOURCE },
    {
      label: "Slope / terrain",
      value:
        terrainStatus === "unavailable"
            ? "Not available in prototype (DEM request failed)"
            : TERRAIN_SOURCE,
    },
    {
      label: "Susceptibility",
      value:
        "Official GSI susceptibility classes not integrated in this phase — a DEM-derived relief proxy is used and labelled as prototype",
    },
  ];
}

export async function predictRisk(input: PredictInput): Promise<RiskPrediction> {
  const location = locateDistrict(input.latitude, input.longitude);

  // Rainfall: live if requested and available, otherwise the supplied
  // demonstration scenario value.
  let rainfallMm = input.rainfall ?? null;
  let rainfallAccumulatedMm: number | null = null;
  let rainfallForecastMm: number | null = null;
  let rainfallStatus: DataStatus = rainfallMm === null ? "unavailable" : "demo";
  let scenario = input.scenario ?? (rainfallMm === null ? "unspecified" : "Demonstration scenario");

  if (input.useLiveWeather) {
    const live = await getLiveRainfall(input.latitude, input.longitude);
    if (live) {
      rainfallMm = live.rainfall24hMm;
      rainfallAccumulatedMm = live.rainfall72hMm;
      rainfallForecastMm = input.includeForecast ? live.forecast24hMm : null;
      rainfallStatus = "live";
      scenario = input.includeForecast
        ? "Forecast-based risk scenario (live observed + next-24h forecast)"
        : "Live observed rainfall";
    }
  }

  const terrain =
    input.slope !== undefined
      ? null
      : await getTerrain(input.latitude, input.longitude).catch(() => null);
  const hist = historicalNear(input.latitude, input.longitude);

  const inputs: RiskFactorInputs = {
    rainfallMm,
    rainfallAccumulatedMm,
    rainfallForecastMm,
    slopeDeg: input.slope ?? terrain?.slopeDeg ?? null,
    historicalCount: hist.count,
    historicalNearestKm: hist.nearestKm,
    terrainReliefM: terrain?.reliefM ?? null,
  };

  const assessment = riskModel.assess(inputs);
  const terrainStatus: DataStatus =
    input.slope !== undefined
      ? "prototype"
      : terrain?.status === "dem"
        ? "source-derived"
        : "unavailable";

  const data_status: RiskDataStatus = {
    rainfall: rainfallStatus,
    slope: terrainStatus,
    historical: "source-derived",
    terrain: terrainStatus === "source-derived" ? "prototype" : terrainStatus,
    sources: sourcesFor(rainfallStatus, terrainStatus),
  };

  // Development logging: no personal data, only location and model inputs.
  console.info("[risk]", {
    lat: input.latitude,
    lon: input.longitude,
    district: location.district,
    rainfallMm,
    slopeDeg: inputs.slopeDeg,
    historicalCount: hist.count,
    score: assessment.risk_score,
    level: assessment.risk_level,
    model: assessment.model_type,
    at: new Date().toISOString(),
  });

  return {
    location,
    inputs,
    assessment,
    data_status,
    scenario,
    generated_at: new Date().toISOString(),
  };
}

/* ------------------------------- Risk grid ------------------------------- */

interface StaticCell {
  id: string;
  bbox: [number, number, number, number];
  centroid: [number, number];
  district: string | null;
  slopeDeg: number | null;
  reliefM: number | null;
  historicalCount: number;
  historicalNearestKm: number | null;
}

let staticCells: StaticCell[] | null = null;
let staticCellsPromise: Promise<StaticCell[]> | null = null;

async function buildStaticCells(): Promise<StaticCell[]> {
  const districts = getDistricts().features;
  const base: StaticCell[] = [];

  for (let lat = MEGHALAYA_BBOX.minLat; lat < MEGHALAYA_BBOX.maxLat; lat += GRID_CELL_DEG) {
    for (let lon = MEGHALAYA_BBOX.minLon; lon < MEGHALAYA_BBOX.maxLon; lon += GRID_CELL_DEG) {
      const cLat = lat + GRID_CELL_DEG / 2;
      const cLon = lon + GRID_CELL_DEG / 2;
      const district = districts.find((f) => pointInArea(cLon, cLat, f.geometry));
      if (!district) continue;
      const hist = historicalNear(cLat, cLon);
      base.push({
        id: `${cLat.toFixed(2)}_${cLon.toFixed(2)}`,
        bbox: [lon, lat, lon + GRID_CELL_DEG, lat + GRID_CELL_DEG],
        centroid: [cLat, cLon],
        district: district.properties.name,
        slopeDeg: null,
        reliefM: null,
        historicalCount: hist.count,
        historicalNearestKm: hist.nearestKm,
      });
    }
  }

  const terrain = await getTerrainBatch(base.map((c) => c.centroid)).catch(() => []);
  base.forEach((c, i) => {
    const t = terrain[i];
    if (t && t.status === "dem") {
      c.slopeDeg = t.slopeDeg;
      c.reliefM = t.reliefM;
    }
  });
  return base;
}

async function getStaticCells(): Promise<StaticCell[]> {
  if (staticCells) return staticCells;
  staticCellsPromise ??= buildStaticCells().then((cells) => {
    staticCells = cells;
    return cells;
  });
  return staticCellsPromise;
}

export async function getRiskGrid(opts: {
  rainfall: number;
  scenario?: string | undefined;
  live?: boolean | undefined;
}): Promise<RiskGridResponse> {
  const cells = await getStaticCells();

  let rainfallMm = opts.rainfall;
  let rainfallStatus: DataStatus = "demo";
  let scenario = opts.scenario ?? "Demonstration scenario";
  if (opts.live) {
    // One representative live sample for the pilot state keeps the grid fast.
    const live = await getLiveRainfall(25.57, 91.88);
    if (live) {
      rainfallMm = live.rainfall24hMm;
      rainfallStatus = "live";
      scenario = "Live observed rainfall (statewide sample point)";
    }
  }

  const summary = { total: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  const out: RiskGridCell[] = cells.map((c) => {
    const assessment = riskModel.assess({
      rainfallMm,
      rainfallAccumulatedMm: null,
      rainfallForecastMm: null,
      slopeDeg: c.slopeDeg,
      historicalCount: c.historicalCount,
      historicalNearestKm: c.historicalNearestKm,
      terrainReliefM: c.reliefM,
    });
    summary.total += 1;
    summary[assessment.risk_level.toLowerCase() as "low"] += 1;
    return {
      id: c.id,
      bbox: c.bbox,
      centroid: c.centroid,
      district: c.district,
      risk_score: assessment.risk_score,
      risk_level: assessment.risk_level,
      slopeDeg: c.slopeDeg,
      historicalCount: c.historicalCount,
    };
  });

  return {
    meta: {
      model_type: riskModel.modelType,
      scenario,
      rainfallMm,
      rainfallStatus,
      cellSizeDeg: GRID_CELL_DEG,
      count: out.length,
      note: "Model-derived prototype risk per grid cell. Colours come from the risk engine, never from random values. Not an official hazard map.",
    },
    summary,
    cells: out,
  };
}
