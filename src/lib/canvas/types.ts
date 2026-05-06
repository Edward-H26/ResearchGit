import type { StickyNote } from "./schema";

export type BoardMode = "select" | "pan";
export type ResizeCorner = "nw" | "ne" | "sw" | "se";

export type DragState =
  | { type: "note"; id: string; offsetX: number; offsetY: number }
  | {
      type: "resize";
      id: string;
      corner: ResizeCorner;
      startX: number;
      startY: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | { type: "pan"; startX: number; startY: number; panX: number; panY: number }
  | null;

export type CanvasUser = {
  id: string;
  handle: string;
};

export type BoardChangeHandler = (notes: ReadonlyArray<StickyNote>) => void;
