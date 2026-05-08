import {
  NOTE_CREATE_OFFSET,
  NOTE_DEFAULT_HEIGHT,
  NOTE_DEFAULT_WIDTH,
  NOTE_FALLBACK_ANCHOR,
  NOTE_FALLBACK_VARIANCE,
  clampZoom,
} from "./constants";
import { makeStickyId, randomStickyRotation } from "./ids";
import type { StickyNote, StickyNoteVersion, StickyNoteVersionSource } from "./schema";

export function createStickyId(random: () => number = Math.random): string {
  return makeStickyId(random);
}

export function createStickyRotation(random: () => number = Math.random): number {
  return randomStickyRotation(random);
}

export { clampZoom };

export function createFallbackBoardPoint(random: () => number = Math.random) {
  return {
    x: NOTE_FALLBACK_ANCHOR.x + random() * NOTE_FALLBACK_VARIANCE.x,
    y: NOTE_FALLBACK_ANCHOR.y + random() * NOTE_FALLBACK_VARIANCE.y,
  };
}

export function updateStickyNote(
  notes: ReadonlyArray<StickyNote>,
  id: string,
  patch: Partial<StickyNote>,
): StickyNote[] {
  return notes.map((note) => (note.id === id ? { ...note, ...patch } : note));
}

export function buildStickyNote(input: {
  authorHandle: string;
  authorUserId: string;
  point: { x: number; y: number };
  random?: () => number;
}): StickyNote {
  const random = input.random ?? Math.random;
  return {
    id: createStickyId(random),
    text: "",
    x: Math.round(input.point.x - NOTE_CREATE_OFFSET.x),
    y: Math.round(input.point.y - NOTE_CREATE_OFFSET.y),
    width: NOTE_DEFAULT_WIDTH,
    height: NOTE_DEFAULT_HEIGHT,
    themeIndex: null,
    themeColorToken: null,
    authorUserId: input.authorUserId,
    authorHandle: input.authorHandle,
    rotation: createStickyRotation(random),
    versions: [],
  };
}

export function buildStickyNoteVersion(input: {
  noteId: string;
  text: string;
  label: string;
  source: StickyNoteVersionSource;
  authorHandle: string;
  ordinal: number;
  createdAt?: string;
}): StickyNoteVersion {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const timestamp = createdAt.replace(/[^0-9]/g, "");
  return {
    id: `${input.noteId}-version-${input.ordinal}-${timestamp}`,
    text: input.text,
    label: input.label,
    source: input.source,
    authorHandle: input.authorHandle,
    createdAt,
  };
}

export function appendStickyNoteVersion(
  note: StickyNote,
  input: Omit<Parameters<typeof buildStickyNoteVersion>[0], "noteId" | "ordinal">,
): StickyNote {
  const versions = note.versions ?? [];
  const version = buildStickyNoteVersion({
    ...input,
    noteId: note.id,
    ordinal: versions.length,
  });
  return {
    ...note,
    versions: [...versions, version],
  };
}
