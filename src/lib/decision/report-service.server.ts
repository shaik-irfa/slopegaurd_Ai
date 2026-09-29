/**
 * Field-verification report service.
 *
 * Reports are ground-verification evidence only: submitting one never changes
 * the model-derived risk score. No personal information is collected or stored.
 */
import type { ReportRecord, ReportStatus, ReportType } from "./types";
import { MEDIA_MAX_BYTES, MEDIA_MIME_TYPES, type ReportInput } from "./schemas";
import { getDistricts } from "@/lib/gis-service.server";
import { pointInArea } from "@/lib/geo";

const BUCKET = "report-media";

/** Which Meghalaya district (official boundary snapshot) contains this point, if any. */
function districtIdAt(lat: number, lon: number): string | null {
  for (const f of getDistricts().features) {
    if (pointInArea(lon, lat, f.geometry)) return f.properties.id;
  }
  return null;
}
const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

interface Row {
  id: string;
  created_at: string;
  latitude: number;
  longitude: number;
  district_id: string | null;
  report_type: string;
  description: string;
  media_path: string | null;
  status: string;
}

async function toRecord(row: Row): Promise<ReportRecord> {
  let media_url: string | null = null;
  if (row.media_path) {
    const supabase = await db();
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.media_path, SIGNED_URL_TTL_SECONDS);
    media_url = data?.signedUrl ?? null;
  }
  return {
    id: row.id,
    created_at: row.created_at,
    latitude: row.latitude,
    longitude: row.longitude,
    district_id: row.district_id,
    report_type: row.report_type as ReportType,
    description: row.description,
    media_url,
    status: row.status as ReportStatus,
  };
}

export async function listReports(): Promise<ReportRecord[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return Promise.all((data as Row[]).map(toRecord));
}

export async function getReport(id: string): Promise<ReportRecord | null> {
  const supabase = await db();
  const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRecord(data as Row) : null;
}

export interface MediaUpload {
  bytes: ArrayBuffer;
  contentType: string;
  size: number;
}

/** Rejects anything outside the allowed image/video types and size budget. */
export function validateMedia(media: MediaUpload): string | null {
  if (!MEDIA_MIME_TYPES.includes(media.contentType as (typeof MEDIA_MIME_TYPES)[number])) {
    return `Unsupported file type. Allowed: ${MEDIA_MIME_TYPES.join(", ")}.`;
  }
  if (media.size > MEDIA_MAX_BYTES) return "File is larger than the 8 MB prototype limit.";
  return null;
}

export async function createReport(
  input: ReportInput,
  media?: MediaUpload,
): Promise<ReportRecord> {
  const supabase = await db();
  let mediaPath: string | null = null;

  if (media) {
    const invalid = validateMedia(media);
    if (invalid) throw new Error(invalid);
    // Safe, generated filename — nothing from the client is used in the path.
    const ext = media.contentType === "video/mp4" ? "mp4" : media.contentType.split("/")[1];
    mediaPath = `reports/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(mediaPath, media.bytes, { contentType: media.contentType, upsert: false });
    if (uploadError) {
      // The text + location report must still succeed if the upload fails.
      console.warn("[slopeguard] report media upload failed", uploadError.message);
      mediaPath = null;
    }
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      latitude: input.latitude,
      longitude: input.longitude,
      district_id: input.district_id ?? districtIdAt(input.latitude, input.longitude),
      report_type: input.report_type,
      description: input.description,
      media_path: mediaPath,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toRecord(data as Row);
}

export async function setReportStatus(
  id: string,
  status: ReportStatus,
): Promise<ReportRecord | null> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRecord(data as Row) : null;
}
