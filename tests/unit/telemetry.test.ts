import { describe, expect, it } from "vitest";
import {
  TelemetryBatchSchema,
  TelemetryEventKindSchema,
  TelemetryEventSchema,
} from "../../src/lib/telemetry/types";

describe("TelemetryEventKindSchema", () => {
  it("accepts each declared kind", () => {
    const kinds = [
      "canvas.opened",
      "canvas.closed",
      "sticky.created",
      "sticky.deleted",
      "sticky.moved",
      "sticky.text_edited",
      "themes.suggested",
      "ideas.generated",
      "ideas.published",
      "session.idle",
      "dashboard.viewed",
      "idea.viewed",
    ] as const;
    for (const kind of kinds) {
      expect(TelemetryEventKindSchema.safeParse(kind).success).toBe(true);
    }
  });

  it("rejects unknown kinds", () => {
    expect(TelemetryEventKindSchema.safeParse("malicious.kind").success).toBe(false);
  });
});

describe("TelemetryEventSchema", () => {
  it("accepts a minimal event with default empty payload", () => {
    const result = TelemetryEventSchema.safeParse({
      kind: "canvas.opened",
      ts: "2026-04-29T01:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payload).toEqual({});
    }
  });

  it("rejects an event with a non-ISO timestamp", () => {
    const result = TelemetryEventSchema.safeParse({
      kind: "canvas.opened",
      ts: "yesterday",
    });
    expect(result.success).toBe(false);
  });

  it("rejects payloads larger than the limit", () => {
    const big = { huge: "x".repeat(11_000) };
    const result = TelemetryEventSchema.safeParse({
      kind: "canvas.opened",
      ts: "2026-04-29T01:00:00.000Z",
      payload: big,
    });
    expect(result.success).toBe(false);
  });

  it("accepts payloads at the limit boundary", () => {
    const ok = { content: "x".repeat(9_900) };
    const result = TelemetryEventSchema.safeParse({
      kind: "canvas.opened",
      ts: "2026-04-29T01:00:00.000Z",
      payload: ok,
    });
    expect(result.success).toBe(true);
  });
});

describe("TelemetryBatchSchema", () => {
  it("rejects an empty batch", () => {
    expect(TelemetryBatchSchema.safeParse({ events: [] }).success).toBe(false);
  });

  it("rejects batches over 100 events", () => {
    const events = Array.from({ length: 101 }, () => ({
      kind: "canvas.opened" as const,
      ts: "2026-04-29T01:00:00.000Z",
    }));
    expect(TelemetryBatchSchema.safeParse({ events }).success).toBe(false);
  });

  it("accepts a 1-event batch", () => {
    const result = TelemetryBatchSchema.safeParse({
      events: [{ kind: "dashboard.viewed", ts: "2026-04-29T01:00:00.000Z" }],
    });
    expect(result.success).toBe(true);
  });
});
