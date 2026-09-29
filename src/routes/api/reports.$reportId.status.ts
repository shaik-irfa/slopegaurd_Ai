import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { reportStatusSchema } from "@/lib/decision/schemas";

export const Route = createFileRoute("/api/reports/$reportId/status")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const id = z.string().uuid().safeParse(params.reportId);
        if (!id.success) return Response.json({ error: "Invalid report id" }, { status: 400 });
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Request body must be JSON" }, { status: 400 });
        }
        const parsed = reportStatusSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.issues.map((i) => i.message) },
            { status: 400 },
          );
        }
        const { setReportStatus } = await import("@/lib/decision/report-service.server");
        try {
          const report = await setReportStatus(id.data, parsed.data.status);
          if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
          return Response.json({ report }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 502 });
        }
      },
    },
  },
});
