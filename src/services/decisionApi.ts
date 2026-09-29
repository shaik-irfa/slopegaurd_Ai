import { queryOptions } from "@tanstack/react-query";
import type { AlertRecord, AlertStatus, ExposureResponse, ReportRecord, ReportStatus } from "@/lib/decision/types";
import type { AlertInput, ReportInput } from "@/lib/decision/schemas";

async function readError(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as { error?: string; issues?: { message: string }[] };
    if (body.error) message = body.error;
    if (body.issues?.length) message += `: ${body.issues.map((i) => i.message).join(", ")}`;
  } catch {
    /* keep the status message */
  }
  throw new Error(message);
}

export function exposureQuery(lat: number | null, lon: number | null, radiusKm = 3, enabled = true) {
  return queryOptions({
    queryKey: ["exposure", lat, lon, radiusKm],
    enabled: enabled && lat !== null && lon !== null,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        radius: String(radiusKm),
      });
      const res = await fetch(`/api/infrastructure/nearby?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return readError(res);
      return (await res.json()) as ExposureResponse;
    },
  });
}

export function alertsQuery(status: AlertStatus | "all" = "all") {
  return queryOptions({
    queryKey: ["alerts", status],
    staleTime: 1000 * 15,
    queryFn: async () => {
      const res = await fetch(`/api/alerts?status=${status}`, { headers: { accept: "application/json" } });
      if (!res.ok) return readError(res);
      const body = (await res.json()) as { alerts: AlertRecord[] };
      return body.alerts;
    },
  });
}

export function alertQuery(id: string) {
  return queryOptions({
    queryKey: ["alert", id],
    queryFn: async () => {
      const res = await fetch(`/api/alerts/${id}`, { headers: { accept: "application/json" } });
      if (!res.ok) return readError(res);
      const body = (await res.json()) as { alert: AlertRecord };
      return body.alert;
    },
  });
}

export async function createAlert(input: AlertInput): Promise<AlertRecord> {
  const res = await fetch("/api/alerts", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return readError(res);
  const body = (await res.json()) as { alert: AlertRecord };
  return body.alert;
}

export async function updateAlertStatus(
  id: string,
  action: "acknowledge" | "resolve",
): Promise<AlertRecord> {
  const res = await fetch(`/api/alerts/${id}/${action}`, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  if (!res.ok) return readError(res);
  const body = (await res.json()) as { alert: AlertRecord };
  return body.alert;
}

export function reportsQuery() {
  return queryOptions({
    queryKey: ["reports"],
    staleTime: 1000 * 15,
    queryFn: async () => {
      const res = await fetch("/api/reports", { headers: { accept: "application/json" } });
      if (!res.ok) return readError(res);
      const body = (await res.json()) as { reports: ReportRecord[] };
      return body.reports;
    },
  });
}

export async function createReport(
  input: ReportInput,
  media?: File | null,
): Promise<ReportRecord> {
  let res: Response;
  if (media) {
    const form = new FormData();
    form.set("latitude", String(input.latitude));
    form.set("longitude", String(input.longitude));
    form.set("report_type", input.report_type);
    form.set("description", input.description);
    if (input.district_id) form.set("district_id", input.district_id);
    form.set("media", media);
    res = await fetch("/api/reports", { method: "POST", body: form });
  } else {
    res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(input),
    });
  }
  if (!res.ok) return readError(res);
  const body = (await res.json()) as { report: ReportRecord };
  return body.report;
}

export async function updateReportStatus(id: string, status: ReportStatus): Promise<ReportRecord> {
  const res = await fetch(`/api/reports/${id}/status`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) return readError(res);
  const body = (await res.json()) as { report: ReportRecord };
  return body.report;
}
