/**
 * UI colours for the four prototype risk categories.
 * These are SLOPEGUARD UI categories for this prototype — they are not
 * verified official GSI/NDMA colour standards.
 */
import type { RiskLevel } from "./types";

export const LEVEL_HEX: Record<RiskLevel, string> = {
  LOW: "#16a34a",
  MODERATE: "#eab308",
  HIGH: "#ea580c",
  CRITICAL: "#dc2626",
};

export const LEVEL_TOKEN: Record<RiskLevel, string> = {
  LOW: "bg-risk-low",
  MODERATE: "bg-risk-moderate",
  HIGH: "bg-risk-high",
  CRITICAL: "bg-risk-critical",
};

export const LEVEL_ORDER: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
