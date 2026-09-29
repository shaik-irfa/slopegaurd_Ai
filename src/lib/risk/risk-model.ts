/**
 * SLOPEGUARD AI — risk model (pure, no I/O, browser- and server-safe).
 *
 * Phase 2 uses a transparent WEIGHTED risk model. This is NOT a trained
 * machine-learning model and not a deterministic landslide predictor. The
 * `RiskModel` interface exists so a future `MLRiskModel` can replace
 * `WeightedRiskModel` without any change to the API or the UI.
 *
 * All weights, normalisation limits and level thresholds come from
 * risk-config.json — nothing is hardcoded here.
 */
import config from "./risk-config.json";
import type {
  FactorKey,
  FactorResult,
  RiskAssessment,
  RiskFactorInputs,
  RiskLevel,
} from "./types";

export const RISK_CONFIG = config;

export interface RiskModel {
  readonly modelType: string;
  readonly modelLabel: string;
  assess(inputs: RiskFactorInputs): RiskAssessment;
}

const LABELS: Record<FactorKey, string> = {
  rainfall: "Rainfall",
  slope: "Slope",
  historical: "Historical activity",
  terrain: "Terrain",
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function band(n: number, available: boolean): FactorResult["band"] {
  if (!available) return "UNAVAILABLE";
  if (n >= 0.75) return "VERY HIGH";
  if (n >= 0.5) return "HIGH";
  if (n >= 0.25) return "MODERATE";
  return "LOW";
}

function levelFor(score: number): RiskLevel {
  const t = config.thresholds;
  if (score >= t.critical) return "CRITICAL";
  if (score >= t.high) return "HIGH";
  if (score >= t.moderate) return "MODERATE";
  return "LOW";
}

/**
 * Effective rainfall load (mm). The 24h value dominates; longer accumulation
 * and forecast rainfall are added with reduced influence because they are
 * weaker triggers than the most recent rainfall.
 */
export function effectiveRainfallMm(inputs: RiskFactorInputs): number | null {
  if (inputs.rainfallMm === null || inputs.rainfallMm === undefined) return null;
  const base = Math.max(0, inputs.rainfallMm);
  const accumulated = Math.max(0, (inputs.rainfallAccumulatedMm ?? base) - base);
  const forecast = Math.max(0, inputs.rainfallForecastMm ?? 0);
  return base + 0.25 * accumulated + 0.4 * forecast;
}

function normaliseRainfall(inputs: RiskFactorInputs) {
  const mm = effectiveRainfallMm(inputs);
  if (mm === null) return { available: false, normalized: 0, detail: "Not available in prototype" };
  const n = config.normalisation.rainfall;
  const normalized = clamp01((mm - n.zeroMm) / (n.saturationMm - n.zeroMm));
  const parts = [`${Math.round(inputs.rainfallMm ?? 0)} mm in 24 h`];
  if (inputs.rainfallAccumulatedMm != null)
    parts.push(`${Math.round(inputs.rainfallAccumulatedMm)} mm over 72 h`);
  if (inputs.rainfallForecastMm != null)
    parts.push(`${Math.round(inputs.rainfallForecastMm)} mm forecast (next 24 h)`);
  return { available: true, normalized, detail: parts.join(" · ") };
}

function normaliseSlope(inputs: RiskFactorInputs) {
  if (inputs.slopeDeg === null || inputs.slopeDeg === undefined)
    return { available: false, normalized: 0, detail: "Not available in prototype" };
  const n = config.normalisation.slope;
  const normalized = clamp01((inputs.slopeDeg - n.flatDeg) / (n.saturationDeg - n.flatDeg));
  return { available: true, normalized, detail: `${inputs.slopeDeg.toFixed(1)}° average gradient` };
}

function normaliseHistorical(inputs: RiskFactorInputs) {
  if (inputs.historicalCount === null || inputs.historicalCount === undefined)
    return {
      available: false,
      normalized: 0,
      detail: "Historical landslide data unavailable for this location",
    };
  const n = config.normalisation.historical;
  const density = clamp01(inputs.historicalCount / n.saturationCount);
  const nearest = inputs.historicalNearestKm;
  const proximity =
    nearest === null || nearest === undefined ? 0 : clamp01(1 - nearest / n.radiusKm);
  const normalized = clamp01(density * n.densityShare + proximity * (1 - n.densityShare));
  const detail =
    `${inputs.historicalCount} recorded landslide${inputs.historicalCount === 1 ? "" : "s"} within ${n.radiusKm} km` +
    (nearest != null ? ` · nearest ${nearest.toFixed(1)} km` : "");
  return { available: true, normalized, detail };
}

function normaliseTerrain(inputs: RiskFactorInputs) {
  if (inputs.terrainReliefM === null || inputs.terrainReliefM === undefined)
    return { available: false, normalized: 0, detail: "Not available in prototype" };
  const n = config.normalisation.terrain;
  const normalized = clamp01(
    (inputs.terrainReliefM - n.flatReliefM) / (n.saturationReliefM - n.flatReliefM),
  );
  return {
    available: true,
    normalized,
    detail: `${Math.round(inputs.terrainReliefM)} m local elevation relief`,
  };
}

function explain(factors: FactorResult[], level: RiskLevel, unavailable: FactorKey[]): string[] {
  const out: string[] = [];
  const byKey = (k: FactorKey) => factors.find((f) => f.key === k)!;

  const rain = byKey("rainfall");
  if (rain.available) {
    if (rain.normalized >= 0.7) out.push(`Very heavy rainfall load (${rain.detail}).`);
    else if (rain.normalized >= 0.4) out.push(`Heavy rainfall load (${rain.detail}).`);
    else if (rain.normalized >= 0.2) out.push(`Moderate rainfall (${rain.detail}).`);
    else out.push(`Low rainfall (${rain.detail}).`);
  }

  const slope = byKey("slope");
  if (slope.available) {
    if (slope.normalized >= 0.6) out.push(`Steep terrain — ${slope.detail}.`);
    else if (slope.normalized >= 0.3) out.push(`Moderately sloping terrain — ${slope.detail}.`);
    else out.push(`Gentle terrain — ${slope.detail}.`);
  }

  const hist = byKey("historical");
  if (hist.available) {
    if (hist.normalized >= 0.5) out.push(`Known landslide activity nearby — ${hist.detail}.`);
    else if (hist.normalized > 0) out.push(`Some past landslide records nearby — ${hist.detail}.`);
    else out.push("No landslide records within the search radius in the source dataset.");
  }

  const terrain = byKey("terrain");
  if (terrain.available && terrain.normalized >= 0.5)
    out.push(`High local relief — ${terrain.detail}.`);

  if (unavailable.length)
    out.push(
      `${unavailable.map((k) => LABELS[k]).join(", ")} not available for this location; the remaining factors were re-weighted.`,
    );

  out.push(
    `Estimated risk level ${level} from the prototype weighted model — decision-support only, not a warning.`,
  );
  return out;
}

function monitoringFor(level: RiskLevel): string {
  switch (level) {
    case "CRITICAL":
      return "Suggested monitoring status: continuous watch — prototype output, verify with official agencies.";
    case "HIGH":
      return "Suggested monitoring status: heightened watch during rainfall — prototype output.";
    case "MODERATE":
      return "Suggested monitoring status: routine observation — prototype output.";
    default:
      return "Suggested monitoring status: baseline observation — prototype output.";
  }
}

function summarise(level: RiskLevel, factors: FactorResult[]): string {
  const drivers = factors
    .filter((f) => f.available && f.normalized >= 0.4)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((f) => f.label.toLowerCase());
  if (!drivers.length)
    return `Estimated risk is ${level.toLowerCase()} — no single factor is strongly elevated at this location.`;
  return `Estimated risk is ${level.toLowerCase()} mainly because of ${drivers.join(" and ")} at this location.`;
}

export class WeightedRiskModel implements RiskModel {
  readonly modelType = config.modelType;
  readonly modelLabel = config.modelLabel;

  assess(inputs: RiskFactorInputs): RiskAssessment {
    const normalised: Record<FactorKey, { available: boolean; normalized: number; detail: string }> =
      {
        rainfall: normaliseRainfall(inputs),
        slope: normaliseSlope(inputs),
        historical: normaliseHistorical(inputs),
        terrain: normaliseTerrain(inputs),
      };

    const keys = Object.keys(normalised) as FactorKey[];
    const weights = config.weights as Record<FactorKey, number>;
    const availableWeight = keys
      .filter((k) => normalised[k].available)
      .reduce((sum, k) => sum + weights[k], 0);

    const factors: FactorResult[] = keys.map((key) => {
      const n = normalised[key];
      const appliedWeight = n.available && availableWeight > 0 ? weights[key] / availableWeight : 0;
      return {
        key,
        label: LABELS[key],
        available: n.available,
        normalized: Number(n.normalized.toFixed(3)),
        contribution: Number((appliedWeight * n.normalized * 100).toFixed(1)),
        appliedWeight: Number(appliedWeight.toFixed(3)),
        band: band(n.normalized, n.available),
        detail: n.detail,
      };
    });

    const raw = factors.reduce((sum, f) => sum + f.contribution, 0);
    const risk_score = Math.min(100, Math.max(0, Math.round(raw)));
    const risk_level = levelFor(risk_score);
    const unavailable = keys.filter((k) => !normalised[k].available);

    return {
      model_type: this.modelType,
      model_label: this.modelLabel,
      risk_score,
      risk_level,
      factors,
      explanation: explain(factors, risk_level, unavailable),
      summary: summarise(risk_level, factors),
      monitoring: monitoringFor(risk_level),
      unavailable_factors: unavailable,
      weights,
      thresholds: config.thresholds,
    };
  }
}

/** Active model. Swap this for an MLRiskModel in a later phase. */
export const riskModel: RiskModel = new WeightedRiskModel();
