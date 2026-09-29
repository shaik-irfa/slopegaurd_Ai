import { describe, expect, it } from "vitest";
import { isAlertEligible, recommendResponse } from "./recommendation";

describe("prototype recommended-response rules", () => {
  it("does not raise alerts below HIGH", () => {
    expect(isAlertEligible("LOW")).toBe(false);
    expect(isAlertEligible("MODERATE")).toBe(false);
    expect(isAlertEligible("HIGH")).toBe(true);
    expect(isAlertEligible("CRITICAL")).toBe(true);
  });

  it("maps every level to a distinct response category", () => {
    const categories = (["LOW", "MODERATE", "HIGH", "CRITICAL"] as const).map(
      (l) => recommendResponse(l).category,
    );
    expect(new Set(categories).size).toBe(4);
  });

  it("mentions exposed asset types for alert-eligible levels", () => {
    const r = recommendResponse("CRITICAL", { exposedAssetTypes: ["road", "school"] });
    expect(r.notes.join(" ")).toMatch(/road/);
    expect(r.notes.join(" ")).toMatch(/school/);
  });

  it("states plainly when no mapped assets were returned", () => {
    const r = recommendResponse("HIGH", { exposedAssetTypes: [] });
    expect(r.notes.join(" ")).toMatch(/exposure is not established/i);
  });

  it("counts field reports as evidence without changing the level", () => {
    const r = recommendResponse("HIGH", { nearbyReports: 2 });
    expect(r.level).toBe("HIGH");
    expect(r.notes.join(" ")).toMatch(/do not change the model-derived score/i);
  });

  it("always carries the prototype disclaimer", () => {
    for (const level of ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const) {
      expect(recommendResponse(level).disclaimer).toMatch(/decision support only/i);
    }
  });

  it("is deterministic for the same inputs", () => {
    const a = recommendResponse("CRITICAL", { exposedAssetTypes: ["road"], nearbyReports: 1 });
    const b = recommendResponse("CRITICAL", { exposedAssetTypes: ["road"], nearbyReports: 1 });
    expect(a).toEqual(b);
  });
});
