import { useCallback, useEffect, useState } from "react";
import { createReport } from "@/services/decisionApi";
import type { ReportInput } from "@/lib/decision/schemas";

const KEY = "slopeguard.report-queue.v1";

/**
 * Prototype offline queue: when a field report cannot be sent (no network),
 * the text + location are stored in this browser and retried. Attached photos
 * are NOT queued — the prototype only retries the written report.
 */
export function useReportQueue(onFlushed?: () => void) {
  const [queued, setQueued] = useState<ReportInput[]>([]);

  const read = useCallback((): ReportInput[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as ReportInput[]) : [];
    } catch {
      return [];
    }
  }, []);

  const write = useCallback((items: ReportInput[]) => {
    setQueued(items);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable — the queue simply stays in memory */
    }
  }, []);

  const enqueue = useCallback(
    (input: ReportInput) => {
      write([...read(), input]);
    },
    [read, write],
  );

  const flush = useCallback(async () => {
    const items = read();
    if (items.length === 0) return;
    const remaining: ReportInput[] = [];
    for (const item of items) {
      try {
        await createReport(item);
      } catch {
        remaining.push(item);
      }
    }
    write(remaining);
    if (remaining.length < items.length) onFlushed?.();
  }, [read, write, onFlushed]);

  useEffect(() => {
    setQueued(read());
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    void flush();
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { queued, enqueue, flush };
}
