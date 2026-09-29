import { createFileRoute } from "@tanstack/react-router";
import { reportInputSchema, MEDIA_MAX_BYTES } from "@/lib/decision/schemas";

export const Route = createFileRoute("/api/reports")({
  server: {
    handlers: {
      GET: async () => {
        const { listReports } = await import("@/lib/decision/report-service.server");
        try {
          const reports = await listReports();
          return Response.json(
            {
              meta: {
                count: reports.length,
                note: "Prototype field-verification reports. Reports never change the model-derived risk score.",
              },
              reports,
            },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 502 });
        }
      },
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") ?? "";
        let raw: Record<string, unknown>;
        let media: { bytes: ArrayBuffer; contentType: string; size: number } | undefined;

        try {
          if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            raw = {
              latitude: Number(form.get("latitude")),
              longitude: Number(form.get("longitude")),
              report_type: form.get("report_type"),
              description: form.get("description"),
              district_id: form.get("district_id") || null,
            };
            const file = form.get("media");
            if (file && typeof file !== "string") {
              if (file.size > MEDIA_MAX_BYTES) {
                return Response.json(
                  { error: "File is larger than the 8 MB prototype limit." },
                  { status: 413 },
                );
              }
              media = {
                bytes: await file.arrayBuffer(),
                contentType: file.type,
                size: file.size,
              };
            }
          } else {
            raw = (await request.json()) as Record<string, unknown>;
          }
        } catch {
          return Response.json({ error: "Could not read the request body" }, { status: 400 });
        }

        const parsed = reportInputSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            {
              error: "Validation failed",
              issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
            },
            { status: 400 },
          );
        }

        const { createReport } = await import("@/lib/decision/report-service.server");
        try {
          const report = await createReport(parsed.data, media);
          return Response.json({ report }, { status: 201, headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 400 });
        }
      },
    },
  },
});
