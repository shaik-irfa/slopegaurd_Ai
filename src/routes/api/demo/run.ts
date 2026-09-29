import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Deterministic demonstration scenario.
 *
 * Runs the same weighted risk engine at a fixed rainfall value, looks up real
 * OpenStreetMap assets nearby, applies the prototype response rules and
 * creates a demonstration alert when the level is HIGH or CRITICAL.
 * No notification is sent anywhere.
 */
const bodySchema = z.object({
  latitude: z.number().min(-90).max(90).default(25.57),
  longitude: z.number().min(-180).max(180).default(91.88),
  rainfall: z.number().min(0).max(2000).default(200),
  scenario: z.string().max(80).default("Extreme demo rainfall (200 mm / 24 h)"),
  radius: z.number().min(0.2).max(10).default(3),
});

export const Route = createFileRoute("/api/demo/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown = {};
        try {
          const text = await request.text();
          raw = text ? JSON.parse(text) : {};
        } catch {
          return Response.json({ error: "Request body must be JSON" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.issues.map((i) => i.message) },
            { status: 400 },
          );
        }
        const { latitude, longitude, rainfall, scenario, radius } = parsed.data;

        const [{ predictRisk }, { findNearbyAssets }, { recommendResponse }, alertService] =
          await Promise.all([
            import("@/lib/risk/risk-service.server"),
            import("@/lib/decision/proximity.server"),
            import("@/lib/decision/recommendation"),
            import("@/lib/decision/alert-service.server"),
          ]);

        try {
          const prediction = await predictRisk({ latitude, longitude, rainfall, scenario });
          const exposure = await findNearbyAssets(latitude, longitude, radius);
          const recommendation = recommendResponse(prediction.assessment.risk_level, {
            exposedAssetTypes: exposure.assets.map((a) => a.type),
          });

          let alert = null;
          if (recommendation.alert_eligible) {
            alert = await alertService.createAlert({
              latitude,
              longitude,
              location_name: prediction.location.district
                ? `${prediction.location.district} (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`
                : `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
              district_id: prediction.location.districtId,
              risk_score: prediction.assessment.risk_score,
              risk_level: prediction.assessment.risk_level as "HIGH" | "CRITICAL",
              reasons: prediction.assessment.explanation,
              assets: exposure.assets.map((a) => ({
                type: a.type,
                name: a.name,
                distance_km: a.distance_km,
              })),
              scenario,
              rainfall_mm: rainfall,
            });
          }

          return Response.json(
            {
              meta: {
                note: "Deterministic prototype demonstration. Same inputs produce the same model-derived score.",
                steps: [
                  "Location selected",
                  "Risk assessed",
                  "Explanation generated",
                  "Nearby mapped assets checked",
                  recommendation.alert_eligible
                    ? "Demonstration alert created"
                    : "No alert (risk below HIGH)",
                ],
              },
              prediction,
              exposure,
              recommendation,
              alert,
            },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 502 });
        }
      },
    },
  },
});
