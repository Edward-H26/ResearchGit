"use client";

import type { RegenerateProgressEvent } from "@/server/deck-service";
import { useCallback, useRef, useState } from "react";

type Status = "idle" | "running" | "done" | "error";

type LogEntry = {
  id: number;
  text: string;
  level: "info" | "success" | "error";
};

function describeEvent(event: RegenerateProgressEvent): LogEntry["text"] {
  switch (event.phase) {
    case "sampling":
      return `Sampled ${event.totalClusters} clusters`;
    case "idea-start":
      return `Idea ${event.index}/${event.total}: generating for cluster ${event.clusterId} (${event.themeLabel})`;
    case "idea-done":
      return `Idea ${event.index}/${event.total} ready: "${event.title}"`;
    case "writing":
      return "Writing deck + ideas to Neo4j";
    case "done":
      return `Done: deck ${event.deckId.slice(0, 8)}... with ${event.ideaCount} ideas`;
    case "error":
      return `Error: ${event.message}`;
  }
}

function levelFor(event: RegenerateProgressEvent): LogEntry["level"] {
  if (event.phase === "error") return "error";
  if (event.phase === "done") return "success";
  return "info";
}

export function RegeneratePanel({ initialOk }: { initialOk: number | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [resultCount, setResultCount] = useState<number | null>(initialOk);
  const logIdRef = useRef(0);

  const appendLog = useCallback((event: RegenerateProgressEvent) => {
    const entry: LogEntry = {
      id: ++logIdRef.current,
      text: describeEvent(event),
      level: levelFor(event),
    };
    setLog((prev) => [...prev, entry]);
  }, []);

  const handleEvent = useCallback(
    (event: RegenerateProgressEvent) => {
      appendLog(event);
      if (event.phase === "sampling") {
        setProgress({ done: 0, total: event.totalClusters });
      } else if (event.phase === "idea-done") {
        setProgress((prev) => ({
          done: Math.min(prev.done + 1, event.total),
          total: event.total,
        }));
      } else if (event.phase === "done") {
        setStatus("done");
        setResultCount(event.ideaCount);
      } else if (event.phase === "error") {
        setStatus("error");
      }
    },
    [appendLog],
  );

  const start = useCallback(async () => {
    setStatus("running");
    setLog([]);
    setProgress({ done: 0, total: 0 });
    setResultCount(null);

    try {
      const res = await fetch("/api/admin/regenerate", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line) {
            try {
              handleEvent(JSON.parse(line) as RegenerateProgressEvent);
            } catch {
              // Skip malformed line; the next one may be valid.
            }
          }
          newlineIndex = buffer.indexOf("\n");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Regeneration failed";
      handleEvent({ phase: "error", message });
    }
  }, [handleEvent]);

  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;
  const isRunning = status === "running";

  return (
    <div className="space-y-6">
      {resultCount !== null && status !== "running" && status !== "error" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          ✓ Regeneration complete. {resultCount} new ideas written to Neo4j.
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Regeneration failed. Inspect the log below for details and try again.
        </div>
      )}

      <button
        type="button"
        onClick={start}
        disabled={isRunning}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? "Generating..." : "Regenerate now"}
      </button>

      {(isRunning || progress.total > 0) && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-xs text-neutral-600">
            <span>
              {progress.done} of {progress.total} ideas
            </span>
            <span>{percent}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
            role="progressbar"
            tabIndex={0}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-neutral-950 transition-[width] duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Activity
          </p>
          <ol className="max-h-60 space-y-1 overflow-y-auto font-mono text-xs leading-relaxed">
            {log.map((entry) => (
              <li
                key={entry.id}
                className={
                  entry.level === "error"
                    ? "text-red-700"
                    : entry.level === "success"
                      ? "text-emerald-700"
                      : "text-neutral-700"
                }
              >
                {entry.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
