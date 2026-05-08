import { z } from "zod";

import { NOTE_MAX_HEIGHT, NOTE_MAX_WIDTH, NOTE_MIN_HEIGHT, NOTE_MIN_WIDTH } from "./constants";

export const StickyNoteVersionSourceSchema = z.enum(["manual", "ai_enhancement", "restore"]);
export type StickyNoteVersionSource = z.infer<typeof StickyNoteVersionSourceSchema>;

export const StickyNoteVersionSchema = z.object({
  id: z.string(),
  text: z.string(),
  label: z.string(),
  source: StickyNoteVersionSourceSchema,
  authorHandle: z.string(),
  createdAt: z.string(),
});
export type StickyNoteVersion = z.infer<typeof StickyNoteVersionSchema>;

export const StickyNoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().min(NOTE_MIN_WIDTH).max(NOTE_MAX_WIDTH),
  height: z.number().min(NOTE_MIN_HEIGHT).max(NOTE_MAX_HEIGHT),
  themeIndex: z.number().int().nullable(),
  themeColorToken: z.string().nullable(),
  authorUserId: z.string(),
  authorHandle: z.string(),
  rotation: z.number(),
  versions: z.array(StickyNoteVersionSchema).default([]),
});
export type StickyNote = z.infer<typeof StickyNoteSchema>;

export const BoardSnapshotSchema = z.object({
  notes: z.array(StickyNoteSchema),
  zoom: z.number().optional(),
  pan: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type BoardSnapshot = z.infer<typeof BoardSnapshotSchema>;
