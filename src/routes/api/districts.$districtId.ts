import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/districts/$districtId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getDistrict, getLandslides, DISTRICT_SOURCE, LANDSLIDE_SOURCE } = await import(
          "@/lib/gis-service.server"
        );
        const feature = getDistrict(params.districtId);
        if (!feature) return new Response("District not found", { status: 404 });
        const landslides = getLandslides(feature.properties.id);
        return Response.json(
          {
            meta: {
              source: `${DISTRICT_SOURCE} | ${LANDSLIDE_SOURCE}`,
              staticSnapshot: true,
              count: landslides.length,
            },
            data: {
              district: feature,
              landslides: { type: "FeatureCollection", features: landslides },
            },
          },
          { headers: { "cache-control": "public, max-age=3600" } },
        );
      },
    },
  },
});
