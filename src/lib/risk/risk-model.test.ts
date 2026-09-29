import { describe, expect, it } from "vitest";
import { WeightedRiskModel, RISK_CONFIG } from "./risk-model";
import type { RiskFactorInputs } from "./types";

const model = new WeightedRiskModel();

const base: RiskFactorInputs = {
  rainfallMm: 0,
  rainfallAccumulatedMm: null,
  rainfallForecastMm: null,
  slopeDeg: 2,
  historicalCount: 0,
  historicalNearestKm: null,
  terrainReliefM: 20,
};

describe("WeightedRiskModel", () => {
  it("labels itself as a prototype weighted model, not an AI model", () => {
    expect(model.modelType).toBe("prototype_weighted_risk_model");
    expect(model.modelType).not.toContain("ai");
  });

  it("low rainfall and low slope produce low risk", () => {
    const r = model.assess(base);
    expect(r.risk_score).toBeLessThan(RISK_CONFIG.thresholds.moderate);
    expect(r.risk_level).toBe("LOW");
  });

  it("risk increases when rainfall increases", () => {
    const low = model.assess({ ...base, rainfallMm: 40, slopeDeg: 25, terrainReliefM: 250 });
    const mid = model.assess({ ...base, rainfallMm: 120, slopeDeg: 25, terrainReliefM: 250 });
    const high = model.assess({ ...base, rainfallMm: 200, slopeDeg: 25, terrainReliefM: 250 });
    expect(mid.risk_score).toBeGreaterThan(low.risk_score);
    expect(high.risk_score).toBeGreaterThan(mid.risk_score);
  });

  it("high rainfall with steep slope raises risk above low", () => {
    const r = model.assess({ ...base, rainfallMm: 150, slopeDeg: 32, terrainReliefM: 400 });
    expect(r.risk_score).toBeGreaterThanOrEqual(RISK_CONFIG.thresholds.high);
    expect(["HIGH", "CRITICAL"]).toContain(r.risk_level);
  });

  it("extreme rainfall + steep slope + dense history reaches high or critical", () => {
    const r = model.assess({
      rainfallMm: 200,
      rainfallAccumulatedMm: 420,
      rainfallForecastMm: 80,
      slopeDeg: 38,
      historicalCount: 40,
      historicalNearestKm: 0.5,
      terrainReliefM: 600,
    });
    expect(r.risk_level).toBe("CRITICAL");
    expect(r.risk_score).toBeGreaterThanOrEqual(RISK_CONFIG.thresholds.critical);
  });

  it("always produces a score between 0 and 100", () => {
    const cases: RiskFactorInputs[] = [
      base,
      { ...base, rainfallMm: 100000, slopeDeg: 90, historicalCount: 9999, terrainReliefM: 99999 },
      { ...base, rainfallMm: 0, slopeDeg: 0, historicalCount: 0, terrainReliefM: 0 },
    ];
    for (const c of cases) {
      const r = model.assess(c);
      expect(r.risk_score).toBeGreaterThanOrEqual(0);
      expect(r.risk_score).toBeLessThanOrEqual(100);
    }
  });

  it("re-weights available factors and reports missing ones honestly", () => {
    const r = model.assess({
      ...base,
      rainfallMm: 120,
      slopeDeg: null,
      terrainReliefM: null,
      historicalCount: null,
      historicalNearestKm: null,
    });
    expect(r.unavailable_factors).toEqual(["slope", "historical", "terrain"]);
    const rain = r.factors.find((f) => f.key === "rainfall")!;
    expect(rain.appliedWeight).toBeCloseTo(1, 3);
    const hist = r.factors.find((f) => f.key === "historical")!;
    expect(hist.detail).toContain("unavailable");
  });

  it("always returns an explanation and factor breakdown", () => {
    const r = model.assess({ ...base, rainfallMm: 90, slopeDeg: 20 });
    expect(r.explanation.length).toBeGreaterThan(1);
    expect(r.factors).toHaveLength(4);
    expect(r.summary.length).toBeGreaterThan(10);
  });

  it("weights in configuration sum to 1", () => {
    const total = Object.values(RISK_CONFIG.weights).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 6);
  });
});
