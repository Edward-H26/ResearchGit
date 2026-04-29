import type { StickyNote } from "./schema";

export type BoardMode = "select" | "pan";

export type DragState =
  | { type: "note"; id: string; offsetX: number; offsetY: number }
  | { type: "pan"; startX: number; startY: number; panX: number; panY: number }
  | null;

export type CanvasUser = {
  id: string;
  handle: string;
};

export type BoardChangeHandler = (notes: ReadonlyArray<StickyNote>) => void;
