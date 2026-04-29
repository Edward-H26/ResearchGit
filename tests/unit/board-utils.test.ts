import { describe, expect, it } from "vitest";
import {
  buildStickyNote,
  clampZoom,
  createFallbackBoardPoint,
  createStickyId,
  createStickyRotation,
  updateStickyNote,
} from "../../src/lib/canvas/board-utils";
import type { StickyNote } from "../../src/lib/canvas/schema";

describe("board-utils", () => {
  it("creates deterministic sticky ids from an injected random source", () => {
    expect(createStickyId(() => 0.123456789)).toBe("note-4fzzzxjy");
  });

  it("creates deterministic sticky rotations from an injected random source", () => {
    expect(createStickyRotation(() => 0)).toBe(-0.6);
    expect(createStickyRotation(() => 1)).toBe(0.6);
  });

  it("creates fallback points within the expected board region", () => {
    const point = createFallbackBoardPoint(() => 0.5);
    expect(point).toEqual({ x: 635, y: 480 });
  });

  it("clamps zoom to supported bounds", () => {
    expect(clampZoom(0.1)).toBe(0.45);
    expect(clampZoom(3)).toBe(1.6);
    expect(clampZoom(1.234)).toBe(1.23);
  });

  it("builds a sticky note from a board point", () => {
    const note = buildStickyNote({
      point: { x: 500, y: 300 },
      intent: "merge",
      authorHandle: "Ada",
      authorUserId: "user-1",
      random: () => 0.5,
    });

    expect(note).toMatchObject({
      text: "",
      x: 420,
      y: 240,
      width: 165,
      height: 145,
      intent: "merge",
      authorHandle: "Ada",
      authorUserId: "user-1",
      rotation: 0,
    });
    expect(note.id).toBe("note-i");
  });

  it("updates only the targeted sticky note", () => {
    const notes: StickyNote[] = [
      {
        id: "a",
        text: "first",
        x: 0,
        y: 0,
        width: 120,
        height: 120,
        intent: "add",
        authorUserId: "1",
        authorHandle: "A",
        rotation: 0,
      },
      {
        id: "b",
        text: "second",
        x: 10,
        y: 10,
        width: 120,
        height: 120,
        intent: "delete",
        authorUserId: "2",
        authorHandle: "B",
        rotation: 0,
      },
    ];

    expect(updateStickyNote(notes, "b", { text: "updated" })).toEqual([
      notes[0],
      { ...notes[1], text: "updated" },
    ]);
  });
});
