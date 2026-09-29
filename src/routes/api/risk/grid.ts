import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const querySchema = z.object({
  rainfall: z.coerce.number().min(0).max(2000).default(40),
  scenario: z.string().max(80).optional(),
  live: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const Route = createFileRoute("/api/risk/grid")({
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
        const { getRiskGrid } = await import("@/lib/risk/risk-service.server");
        const grid = await getRiskGrid(parsed.data);
        return Response.json(grid, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
