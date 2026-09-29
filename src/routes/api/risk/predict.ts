import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  rainfall: z.number().min(0).max(2000).optional(),
  slope: z.number().min(0).max(90).optional(),
  scenario: z.string().max(80).optional(),
  useLiveWeather: z.boolean().optional(),
  includeForecast: z.boolean().optional(),
});

export const Route = createFileRoute("/api/risk/predict")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Request body must be JSON" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
            { status: 400 },
          );
        }

        const { predictRisk } = await import("@/lib/risk/risk-service.server");
        const prediction = await predictRisk(parsed.data);
        return Response.json(prediction, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
