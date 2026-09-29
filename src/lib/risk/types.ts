/**
 * Shared risk-engine types (browser- and server-safe).
 *
 * Everything here describes a PROTOTYPE, explainable, weighted risk estimate.
 * It is not a deterministic landslide prediction and carries no official
 * warning authority.
 */

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type FactorKey = "rainfall" | "slope" | "historical" | "terrain";

/** Raw measured / supplied inputs. `null` means "not available". */
export interface RiskFactorInputs {
  /** Rainfall in mm over the last 24h (observed or demonstration scenario). */
  rainfallMm: number | null;
  /** Longer accumulation (e.g. 72h) in mm, if known. */
  rainfallAccumulatedMm?: number | null;
  /** Forecast rainfall for the next 24h in mm, if known. */
  rainfallForecastMm?: number | null;
  /** Terrain gradient in degrees. */
  slopeDeg: number | null;
  /** Number of recorded landslides within the configured radius. */
  historicalCount: number | null;
  /** Distance in km to the nearest recorded landslide. */
  historicalNearestKm: number | null;
  /** Local elevation relief in metres (prototype terrain proxy). */
  terrainReliefM: number | null;
}

export interface FactorResult {
  key: FactorKey;
  label: string;
  available: boolean;
  /** 0-1 normalised factor value (prototype normalisation). */
  normalized: number;
  /** Points contributed to the 0-100 score. */
  contribution: number;
  /** Weight actually applied (renormalised when factors are missing). */
  appliedWeight: number;
  band: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | "UNAVAILABLE";
  /** Plain-English value description, e.g. "128 mm in 24 h". */
  detail: string;
}

export interface RiskAssessment {
  model_type: string;
  model_label: string;
  risk_score: number;
  risk_level: RiskLevel;
  factors: FactorResult[];
  explanation: string[];
  summary: string;
  monitoring: string;
  unavailable_factors: FactorKey[];
  weights: Record<FactorKey, number>;
  thresholds: { moderate: number; high: number; critical: number };
}

export type DataStatus = "live" | "demo" | "source-derived" | "prototype" | "unavailable";

export interface RiskDataStatus {
  rainfall: DataStatus;
  slope: DataStatus;
  historical: DataStatus;
  terrain: DataStatus;
  sources: { label: string; value: string }[];
}

export interface RiskLocation {
  latitude: number;
  longitude: number;
  district: string | null;
  districtId: string | null;
}

export interface RiskPrediction {
  location: RiskLocation;
  inputs: RiskFactorInputs;
  assessment: RiskAssessment;
  data_status: RiskDataStatus;
  scenario: string;
  generated_at: string;
}

export interface RiskGridCell {
  id: string;
  /** [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number];
  centroid: [number, number];
  district: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  slopeDeg: number | null;
  historicalCount: number;
}

export interface RiskGridResponse {
  meta: {
    model_type: string;
    scenario: string;
    rainfallMm: number;
    rainfallStatus: DataStatus;
    cellSizeDeg: number;
    count: number;
    note: string;
  };
  summary: {
    total: number;
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  cells: RiskGridCell[];
}
