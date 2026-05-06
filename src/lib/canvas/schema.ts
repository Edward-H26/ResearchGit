import { z } from "zod";

export const StickyNoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().min(90).max(360),
  height: z.number().min(80).max(320),
  themeIndex: z.number().int().nullable(),
  themeColorToken: z.string().nullable(),
  authorUserId: z.string(),
  authorHandle: z.string(),
  rotation: z.number(),
});
export type StickyNote = z.infer<typeof StickyNoteSchema>;

export const BoardSnapshotSchema = z.object({
  notes: z.array(StickyNoteSchema),
  zoom: z.number().optional(),
  pan: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type BoardSnapshot = z.infer<typeof BoardSnapshotSchema>;
