import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/alerts/$alertId/resolve")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const id = z.string().uuid().safeParse(params.alertId);
        if (!id.success) return Response.json({ error: "Invalid alert id" }, { status: 400 });
        const { setAlertStatus } = await import("@/lib/decision/alert-service.server");
        try {
          const alert = await setAlertStatus(id.data, "resolved");
          if (!alert) return Response.json({ error: "Alert not found" }, { status: 404 });
          return Response.json({ alert }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 502 });
        }
      },
    },
  },
});
