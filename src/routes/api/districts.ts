import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/districts")({
  server: {
    handlers: {
      GET: async () => {
        const { getDistricts, DISTRICT_SOURCE } = await import("@/lib/gis-service.server");
        const data = getDistricts();
        return Response.json(
          {
            meta: { source: DISTRICT_SOURCE, staticSnapshot: true, count: data.features.length },
            data,
          },
          { headers: { "cache-control": "public, max-age=3600" } },
        );
      },
    },
  },
});
