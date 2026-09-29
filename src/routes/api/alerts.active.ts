import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/alerts/active")({
  server: {
    handlers: {
      GET: async () => {
        const { listActiveAlerts } = await import("@/lib/decision/alert-service.server");
        try {
          const alerts = await listActiveAlerts();
          return Response.json(
            {
              meta: {
                count: alerts.length,
                note: "Active and acknowledged prototype alerts (no notifications are sent)",
              },
              alerts,
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
