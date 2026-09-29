/**
 * Prototype recommended-response engine — a small, transparent rule table.
 *
 * These are PROTOTYPE response categories written by a student team for a
 * demonstration. They are NOT official Government of India, NDMA, SDMA or GSI
 * emergency thresholds or instructions.
 */
import type { RiskLevel } from "@/lib/risk/types";
import type { AssetType, ResponseCategory } from "./types";
import { ASSET_LABELS } from "./types";

export interface ResponseRecommendation {
  level: RiskLevel;
  category: ResponseCategory;
  category_label: string;
  action: string;
  /** Extra, exposure-aware prototype notes. */
  notes: string[];
  /** True when the prototype workflow offers to raise a demonstration alert. */
  alert_eligible: boolean;
  disclaimer: string;
}

const RULES: Record<
  RiskLevel,
  { category: ResponseCategory; category_label: string; action: string; alert_eligible: boolean }
> = {
  LOW: {
    category: "NO ALERT",
    category_label: "No alert — routine monitoring",
    action: "Continue normal monitoring.",
    alert_eligible: false,
  },
  MODERATE: {
    category: "MONITOR",
    category_label: "Monitor",
    action: "Continue monitoring rainfall and slope conditions.",
    alert_eligible: false,
  },
  HIGH: {
    category: "WARNING",
    category_label: "Warning / increased monitoring",
    action: "Increase monitoring and inspect exposed infrastructure.",
    alert_eligible: true,
  },
  CRITICAL: {
    category: "URGENT",
    category_label: "Urgent attention / emergency preparedness",
    action: "Initiate urgent field verification and prepare local emergency response.",
    alert_eligible: true,
  },
};

export const DISCLAIMER =
  "Prototype recommended response — decision support only. Not an official disaster-management instruction and not an emergency notification.";

export function recommendResponse(
  level: RiskLevel,
  options: { exposedAssetTypes?: AssetType[]; nearbyReports?: number } = {},
): ResponseRecommendation {
  const rule = RULES[level];
  const notes: string[] = [];

  const types = [...new Set(options.exposedAssetTypes ?? [])];
  if (rule.alert_eligible && types.length > 0) {
    notes.push(
      `Exposure detected near the assessed point: ${types
        .map((t) => ASSET_LABELS[t].toLowerCase())
        .join(", ")}. These assets are located near the identified risk area — no damage is implied.`,
    );
  }
  if (rule.alert_eligible && types.length === 0) {
    notes.push("No mapped assets were returned for this radius, so exposure is not established.");
  }
  if ((options.nearbyReports ?? 0) > 0) {
    notes.push(
      `${options.nearbyReports} nearby field report(s) available as ground-verification evidence. Reports do not change the model-derived score.`,
    );
  }
  if (level === "CRITICAL") {
    notes.push("Prototype workflow: raise a demonstration alert and request field verification.");
  }

  return {
    level,
    category: rule.category,
    category_label: rule.category_label,
    action: rule.action,
    alert_eligible: rule.alert_eligible,
    notes,
    disclaimer: DISCLAIMER,
  };
}

/** HIGH and CRITICAL are the only levels that create a demonstration alert. */
export function isAlertEligible(level: RiskLevel): boolean {
  return RULES[level].alert_eligible;
}
