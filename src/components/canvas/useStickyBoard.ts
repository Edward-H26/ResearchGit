"use client";

import { updateStickyNote } from "@/lib/canvas";
import type { StickyNote } from "@/lib/canvas/schema";
import type { BoardChangeHandler, CanvasUser } from "@/lib/canvas/types";
import { useEffect, useState } from "react";
import { useStickyBoardController } from "./useStickyBoardController";

type UseStickyBoardInput = {
  currentUser: CanvasUser;
  initialNotes: ReadonlyArray<StickyNote>;
  onChange?: BoardChangeHandler | undefined;
};

export type { UseStickyBoardInput };

export function useStickyBoard(input: UseStickyBoardInput) {
  const [notes, setNotesState] = useState<StickyNote[]>(() => [...input.initialNotes]);
  const onChange = input.onChange;

  useEffect(() => {
    onChange?.(notes);
  }, [notes, onChange]);

  function setNotes(next: StickyNote[] | ((prev: StickyNote[]) => StickyNote[])) {
    setNotesState((prev) => (typeof next === "function" ? next(prev) : next));
  }

  return useStickyBoardController({
    currentUser: input.currentUser,
    storage: {
      notes,
      addNote: (note) => setNotes((existing) => [...existing, note]),
      patchNote: (id, patch) => setNotes((existing) => updateStickyNote(existing, id, patch)),
      deleteNote: (id) => setNotes((existing) => existing.filter((note) => note.id !== id)),
      clearNotes: () => setNotes([]),
    },
  });
}
