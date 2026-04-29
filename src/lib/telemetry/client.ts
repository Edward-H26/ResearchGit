"use client";

import {
  TELEMETRY_BATCH_SIZE_MAX,
  TELEMETRY_ENDPOINT,
  TELEMETRY_FLUSH_INTERVAL_MS,
  type TelemetryEvent,
  type TelemetryEventKind,
} from "./types";

let queue: TelemetryEvent[] = [];
let flushTimer: number | null = null;
let unloadHandlersAttached = false;

export type EmitInput = {
  kind: TelemetryEventKind;
  ideaId?: string;
  stickyId?: string;
  payload?: Record<string, unknown>;
};

export function emitEvent(input: EmitInput): void {
  if (typeof window === "undefined") return;
  attachUnloadHandlersOnce();

  const event: TelemetryEvent = {
    kind: input.kind,
    ts: new Date().toISOString(),
    payload: input.payload ?? {},
    ...(input.ideaId ? { ideaId: input.ideaId } : {}),
    ...(input.stickyId ? { stickyId: input.stickyId } : {}),
  };

  queue.push(event);

  if (queue.length >= TELEMETRY_BATCH_SIZE_MAX) {
    flush();
  } else {
    scheduleFlush();
  }
}

export function flushTelemetry(): void {
  flush();
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flush();
  }, TELEMETRY_FLUSH_INTERVAL_MS);
}

function flush() {
  if (queue.length === 0) return;
  const batch = drainQueueBatch();

  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  const payload = JSON.stringify({ events: batch });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(TELEMETRY_ENDPOINT, blob)) return;
  }

  void fetch(TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    queue = [...batch, ...queue];
  });
}

function drainQueueBatch(): TelemetryEvent[] {
  const batch = queue;
  queue = [];
  return batch;
}

function attachUnloadHandlersOnce() {
  if (unloadHandlersAttached) return;
  unloadHandlersAttached = true;
  window.addEventListener("beforeunload", flush);
  window.addEventListener("pagehide", flush);
}
