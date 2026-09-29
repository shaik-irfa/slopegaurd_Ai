/**
 * Prototype alert service — stores and updates demonstration alerts.
 *
 * An alert here is an in-app decision-support record. Nothing is sent to any
 * authority, phone number or email address.
 */
import { recommendResponse } from "./recommendation";
import type { AlertRecord, AlertStatus } from "./types";
import type { AlertInput } from "./schemas";
import type { RiskLevel } from "@/lib/risk/types";
import { haversineKm } from "@/lib/geo";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

interface Row {
  id: string;
  created_at: string;
  updated_at: string;
  latitude: number;
  longitude: number;
  location_name: string;
  district_id: string | null;
  risk_score: number;
  risk_level: string;
  reasons: unknown;
  assets: unknown;
  recommended_action: string;
  response_category: string;
  scenario: string | null;
  rainfall_mm: number | null;
  status: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

function toRecord(row: Row): AlertRecord {
  return {
    ...row,
    risk_level: row.risk_level as RiskLevel,
    reasons: Array.isArray(row.reasons) ? (row.reasons as string[]) : [],
    assets: Array.isArray(row.assets) ? (row.assets as AlertRecord["assets"]) : [],
    response_category: row.response_category as AlertRecord["response_category"],
    status: row.status as AlertStatus,
  };
}

export async function listAlerts(status?: AlertStatus | "all"): Promise<AlertRecord[]> {
  const supabase = await db();
  let query = supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as Row[]).map(toRecord);
}

export async function listActiveAlerts(): Promise<AlertRecord[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .in("status", ["active", "acknowledged"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data as Row[]).map(toRecord);
}

export async function getAlert(id: string): Promise<AlertRecord | null> {
  const supabase = await db();
  const { data, error } = await supabase.from("alerts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRecord(data as Row) : null;
}

/** Window and distance used to treat a new alert as a duplicate of an open one. */
const DUPLICATE_WINDOW_MINUTES = 60;
const DUPLICATE_RADIUS_KM = 1;

export async function createAlert(input: AlertInput): Promise<AlertRecord> {
  const recommendation = recommendResponse(input.risk_level as RiskLevel, {
    exposedAssetTypes: input.assets.map((a) => a.type),
  });
  const supabase = await db();

  // Do not stack repeat alerts: an open alert for the same place and level is reused.
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60_000).toISOString();
  const { data: open } = await supabase
    .from("alerts")
    .select("*")
    .in("status", ["active", "acknowledged"])
    .eq("risk_level", input.risk_level)
    .gte("created_at", since)
    .limit(50);
  const existing = (open as Row[] | null)?.find(
    (row) => haversineKm(input.latitude, input.longitude, row.latitude, row.longitude) <= DUPLICATE_RADIUS_KM,
  );
  if (existing) {
    console.info("[slopeguard] duplicate prototype alert reused", { id: existing.id });
    return toRecord(existing);
  }
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      latitude: input.latitude,
      longitude: input.longitude,
      location_name: input.location_name,
      district_id: input.district_id ?? null,
      risk_score: Math.round(input.risk_score),
      risk_level: input.risk_level,
      reasons: input.reasons,
      assets: input.assets,
      recommended_action: recommendation.action,
      response_category: recommendation.category,
      scenario: input.scenario ?? null,
      rainfall_mm: input.rainfall_mm ?? null,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  console.info("[slopeguard] prototype alert created", {
    id: (data as Row).id,
    level: input.risk_level,
    score: input.risk_score,
  });
  return toRecord(data as Row);
}

export async function setAlertStatus(
  id: string,
  status: Extract<AlertStatus, "acknowledged" | "resolved">,
): Promise<AlertRecord | null> {
  const supabase = await db();
  const patch =
    status === "acknowledged"
      ? { status, acknowledged_at: new Date().toISOString() }
      : { status, resolved_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("alerts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRecord(data as Row) : null;
}
