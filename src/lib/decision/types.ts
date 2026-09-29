/**
 * Phase 3 decision-support types (browser- and server-safe).
 *
 * Everything here describes PROTOTYPE decision support: exposure of nearby
 * public-map assets, demonstration alerts and field-verification reports.
 * Nothing here carries official warning or evacuation authority.
 */
import type { RiskLevel } from "@/lib/risk/types";

export type AssetType = "road" | "village" | "school" | "hospital" | "bridge";

export interface NearbyAsset {
  type: AssetType;
  /** Name exactly as published by the source, or an explicit unnamed label. */
  name: string;
  named: boolean;
  /** Straight-line distance in km, or null when geometry is unavailable. */
  distance_km: number | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
}

export interface ExposureResponse {
  meta: {
    status: "available" | "unavailable";
    source: string;
    radius_km: number;
    note: string;
    message?: string;
  };
  location: { latitude: number; longitude: number };
  counts: Record<AssetType, number>;
  assets: NearbyAsset[];
}

export type AlertStatus = "active" | "acknowledged" | "resolved";
export type ResponseCategory = "NO ALERT" | "MONITOR" | "WARNING" | "URGENT";

export interface AlertRecord {
  id: string;
  created_at: string;
  updated_at: string;
  latitude: number;
  longitude: number;
  location_name: string;
  district_id: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  reasons: string[];
  assets: { type: AssetType; name: string; distance_km: number | null }[];
  recommended_action: string;
  response_category: ResponseCategory;
  scenario: string | null;
  rainfall_mm: number | null;
  status: AlertStatus;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export type ReportType =
  | "cracks"
  | "rockfall"
  | "slope_movement"
  | "blocked_road"
  | "water_seepage"
  | "other";

export type ReportStatus = "pending" | "verified" | "rejected";

export interface ReportRecord {
  id: string;
  created_at: string;
  latitude: number;
  longitude: number;
  district_id: string | null;
  report_type: ReportType;
  description: string;
  /** Short-lived signed URL, or null when no media was attached. */
  media_url: string | null;
  status: ReportStatus;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  cracks: "Cracks",
  rockfall: "Rockfall",
  slope_movement: "Slope movement",
  blocked_road: "Blocked road",
  water_seepage: "Water seepage",
  other: "Other",
};

export const ASSET_LABELS: Record<AssetType, string> = {
  road: "Road",
  village: "Village / settlement",
  school: "School",
  hospital: "Hospital / clinic",
  bridge: "Bridge",
};

export const ASSET_ICONS: Record<AssetType, string> = {
  road: "🛣",
  village: "🏠",
  school: "🏫",
  hospital: "🏥",
  bridge: "🌉",
};
