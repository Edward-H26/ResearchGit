import { z } from "zod";

export const TelemetryEventKindSchema = z.enum([
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
]);

export type TelemetryEventKind = z.infer<typeof TelemetryEventKindSchema>;

const PAYLOAD_MAX_BYTES = 10_000;

export const TelemetryEventSchema = z.object({
  kind: TelemetryEventKindSchema,
  ts: z.string().datetime(),
  ideaId: z.string().max(128).optional(),
  stickyId: z.string().max(128).optional(),
  payload: z
    .record(z.unknown())
    .default({})
    .refine((value) => JSON.stringify(value).length <= PAYLOAD_MAX_BYTES, {
      message: `payload exceeds ${PAYLOAD_MAX_BYTES} bytes`,
    }),
});

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

export const TelemetryBatchSchema = z.object({
  events: z.array(TelemetryEventSchema).min(1).max(100),
});

export type TelemetryBatch = z.infer<typeof TelemetryBatchSchema>;

export const TELEMETRY_ENDPOINT = "/api/telemetry/batch";
export const TELEMETRY_FLUSH_INTERVAL_MS = 5_000;
export const TELEMETRY_BATCH_SIZE_MAX = 50;
