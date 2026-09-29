import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/reports/$reportId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = z.string().uuid().safeParse(params.reportId);
        if (!id.success) return Response.json({ error: "Invalid report id" }, { status: 400 });
        const { getReport } = await import("@/lib/decision/report-service.server");
        try {
          const report = await getReport(id.data);
          if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
          return Response.json({ report }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 502 });
        }
      },
    },
  },
});
