import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.2).max(10).default(3),
});

export const Route = createFileRoute("/api/infrastructure/nearby")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.issues.map((i) => i.message) },
            { status: 400 },
          );
        }
        const { findNearbyAssets } = await import("@/lib/decision/proximity.server");
        const { lat, lon, radius } = parsed.data;
        const exposure = await findNearbyAssets(lat, lon, radius);
        return Response.json(exposure, {
          headers: { "cache-control": "public, max-age=300" },
        });
      },
    },
  },
});
