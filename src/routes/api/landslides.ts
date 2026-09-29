import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const querySchema = z.object({
  district: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

export const Route = createFileRoute("/api/landslides")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) return new Response("Invalid query parameters", { status: 400 });

        const { getLandslides, LANDSLIDE_SOURCE } = await import("@/lib/gis-service.server");
        let features = getLandslides(parsed.data.district);
        if (parsed.data.limit) features = features.slice(0, parsed.data.limit);

        return Response.json(
          {
            meta: { source: LANDSLIDE_SOURCE, staticSnapshot: true, count: features.length },
            data: { type: "FeatureCollection", features },
          },
          { headers: { "cache-control": "public, max-age=3600" } },
        );
      },
    },
  },
});
