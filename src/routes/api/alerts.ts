import { createFileRoute } from "@tanstack/react-router";
import { alertInputSchema } from "@/lib/decision/schemas";

export const Route = createFileRoute("/api/alerts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const status = new URL(request.url).searchParams.get("status") ?? "all";
        if (!["all", "active", "acknowledged", "resolved"].includes(status)) {
          return Response.json({ error: "Unknown status filter" }, { status: 400 });
        }
        const { listAlerts } = await import("@/lib/decision/alert-service.server");
        try {
          const alerts = await listAlerts(status as "all");
          return Response.json(
            { meta: { count: alerts.length, note: "Prototype demonstration alerts" }, alerts },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 502 });
        }
      },
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Request body must be JSON" }, { status: 400 });
        }
        const parsed = alertInputSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            {
              error: "Validation failed",
              issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
            },
            { status: 400 },
          );
        }
        if (parsed.data.risk_level !== "HIGH" && parsed.data.risk_level !== "CRITICAL") {
          return Response.json(
            {
              error:
                "Prototype alerts are only created for HIGH or CRITICAL model-derived risk levels.",
            },
            { status: 422 },
          );
        }
        const { createAlert } = await import("@/lib/decision/alert-service.server");
        try {
          const alert = await createAlert(parsed.data);
          return Response.json({ alert }, { status: 201, headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 502 });
        }
      },
    },
  },
});
