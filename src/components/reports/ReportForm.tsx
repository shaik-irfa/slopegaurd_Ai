import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ClipboardList, Loader2, WifiOff } from "lucide-react";
import { createReport } from "@/services/decisionApi";
import { REPORT_TYPES, MEDIA_MAX_BYTES, MEDIA_MIME_TYPES } from "@/lib/decision/schemas";
import { REPORT_TYPE_LABELS, type ReportType } from "@/lib/decision/types";
import { useReportQueue } from "@/hooks/useReportQueue";

interface Props {
  latitude: number | null;
  longitude: number | null;
  districtId?: string | null;
  onUseMyLocation?: () => void;
}

/** Mobile-first field / citizen verification form. */
export function ReportForm({ latitude, longitude, districtId, onUseMyLocation }: Props) {
  const uid = useId();
  const queryClient = useQueryClient();
  const [type, setType] = useState<ReportType>("cracks");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [queuedNotice, setQueuedNotice] = useState(false);

  const { queued, flush } = useReportQueue(() => {
    void queryClient.invalidateQueries({ queryKey: ["reports"] });
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (latitude === null || longitude === null) throw new Error("Select a location first.");
      const input = {
        latitude,
        longitude,
        report_type: type,
        description: description.trim(),
        district_id: districtId ?? null,
      };
      try {
        return await createReport(input, file);
      } catch (error) {
        // Offline or unreachable: keep the written report and retry later.
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const raw = window.localStorage.getItem("slopeguard.report-queue.v1");
          const items = raw ? (JSON.parse(raw) as unknown[]) : [];
          window.localStorage.setItem(
            "slopeguard.report-queue.v1",
            JSON.stringify([...items, input]),
          );
          setQueuedNotice(true);
          return null;
        }
        throw error;
      }
    },
    onSuccess: (report) => {
      setDescription("");
      setFile(null);
      if (report) void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const disabled =
    latitude === null || longitude === null || description.trim().length < 5 || submit.isPending;

  return (
    <section aria-label="Field verification report" className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <ClipboardList className="size-3.5" aria-hidden /> Field / citizen verification
      </h2>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Report what you can actually see on the ground. Reports are stored as verification evidence
        and <strong>never change the model-derived risk score</strong>. No name, phone number or
        other personal information is collected.
      </p>

      <div className="rounded-md border border-panel-border bg-secondary/50 p-2.5 text-xs">
        {latitude !== null && longitude !== null ? (
          <span>
            Location: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-hazard">
            Select a point on the map (or use your location) before reporting.
          </span>
        )}
        {onUseMyLocation ? (
          <button
            type="button"
            onClick={onUseMyLocation}
            className="ml-2 font-semibold text-primary underline"
          >
            Use my location
          </button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${uid}-type`} className="text-xs font-semibold">
          What did you observe?
        </label>
        <select
          id={`${uid}-type`}
          value={type}
          onChange={(e) => setType(e.target.value as ReportType)}
          className="min-h-11 w-full rounded-md border border-panel-border bg-background px-3 text-sm"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t} value={t}>
              {REPORT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${uid}-desc`} className="text-xs font-semibold">
          Description
        </label>
        <textarea
          id={`${uid}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. New cracks across the road near the culvert, about 3 m long."
          className="w-full rounded-md border border-panel-border bg-background p-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${uid}-media`}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-panel-border px-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Camera className="size-4" aria-hidden /> {file ? "Change photo" : "Add photo (optional)"}
        </label>
        <input
          id={`${uid}-media`}
          type="file"
          accept={MEDIA_MIME_TYPES.join(",")}
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFileError(null);
            if (!f) return setFile(null);
            if (!MEDIA_MIME_TYPES.includes(f.type as (typeof MEDIA_MIME_TYPES)[number])) {
              setFileError("Only JPEG, PNG, WebP images or MP4 video can be attached.");
              return setFile(null);
            }
            if (f.size > MEDIA_MAX_BYTES) {
              setFileError("File is larger than the 8 MB prototype limit.");
              return setFile(null);
            }
            setFile(f);
          }}
        />
        {file ? <p className="text-xs text-muted-foreground">Attached: {file.name}</p> : null}
        {fileError ? <p className="text-xs text-hazard">{fileError}</p> : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => submit.mutate()}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-hazard px-4 text-sm font-bold uppercase tracking-wide text-hazard-foreground disabled:opacity-50"
      >
        {submit.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Submit report
      </button>

      {submit.isSuccess && !queuedNotice ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-risk-low">
          <Check className="size-3.5" aria-hidden /> Report saved and shown on the map as pending
          verification.
        </p>
      ) : null}
      {queuedNotice ? (
        <p className="flex items-center gap-1.5 text-xs text-hazard">
          <WifiOff className="size-3.5" aria-hidden /> You appear to be offline. The report is
          stored on this device and will be sent when the connection returns.
        </p>
      ) : null}
      {submit.isError ? (
        <p className="text-xs text-hazard">{(submit.error as Error).message}</p>
      ) : null}
      {queued.length > 0 ? (
        <button
          type="button"
          onClick={() => void flush()}
          className="text-xs font-semibold text-primary underline"
        >
          {queued.length} report(s) waiting on this device — retry now
        </button>
      ) : null}
    </section>
  );
}
