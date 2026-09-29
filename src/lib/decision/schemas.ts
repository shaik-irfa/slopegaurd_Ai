/**
 * Validation schemas shared by the API routes and the client forms.
 * Client-safe: no server-only imports.
 */
import { z } from "zod";

export const REPORT_TYPES = [
  "cracks",
  "rockfall",
  "slope_movement",
  "blocked_road",
  "water_seepage",
  "other",
] as const;

export const RISK_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;

export const latitude = z.number().min(-90).max(90);
export const longitude = z.number().min(-180).max(180);

export const reportInputSchema = z.object({
  latitude,
  longitude,
  report_type: z.enum(REPORT_TYPES),
  description: z.string().trim().min(5).max(1000),
  district_id: z.string().max(80).nullish(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const reportStatusSchema = z.object({
  status: z.enum(["pending", "verified", "rejected"]),
});

export const alertInputSchema = z.object({
  latitude,
  longitude,
  location_name: z.string().trim().min(1).max(160),
  district_id: z.string().max(80).nullish(),
  risk_score: z.number().min(0).max(100),
  risk_level: z.enum(RISK_LEVELS),
  reasons: z.array(z.string().max(400)).max(12).default([]),
  assets: z
    .array(
      z.object({
        type: z.enum(["road", "village", "school", "hospital", "bridge"]),
        name: z.string().max(160),
        distance_km: z.number().nullable(),
      }),
    )
    .max(60)
    .default([]),
  scenario: z.string().max(80).nullish(),
  rainfall_mm: z.number().min(0).max(2000).nullish(),
});
export type AlertInput = z.infer<typeof alertInputSchema>;

export const MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"] as const;
export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
