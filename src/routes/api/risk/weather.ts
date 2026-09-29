import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export const Route = createFileRoute("/api/risk/weather")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json({ error: "Invalid coordinates" }, { status: 400 });
        }
        const { getLiveRainfall } = await import("@/lib/risk/weather.server");
        const live = await getLiveRainfall(parsed.data.lat, parsed.data.lon);
        if (!live) {
          return Response.json(
            {
              available: false,
              status: "unavailable",
              message: "Live rainfall not available right now — use the demonstration scenario.",
            },
            { status: 200 },
          );
        }
        return Response.json({ available: true, ...live });
      },
    },
  },
});
