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
  readOnly?: boolean;
};

export type { UseStickyBoardInput };

function notesSignature(notes: ReadonlyArray<StickyNote>): string {
  return notes
    .map((note) => {
      const versions = (note.versions ?? [])
        .map(
          (version) =>
            `${version.id}:${version.text}:${version.label}:${version.source}:${version.authorHandle}:${version.createdAt}`,
        )
        .join(",");
      return `${note.id}:${note.text}:${note.x}:${note.y}:${note.width}:${note.height}:${note.themeIndex}:${note.themeColorToken}:${note.authorUserId}:${note.authorHandle}:${note.rotation}:${versions}`;
    })
    .join("|");
}

export function useStickyBoard(input: UseStickyBoardInput) {
  const [notes, setNotesState] = useState<StickyNote[]>(() => [...input.initialNotes]);
  const onChange = input.onChange;

  useEffect(() => {
    setNotesState((current) => {
      if (notesSignature(current) === notesSignature(input.initialNotes)) return current;
      return [...input.initialNotes];
    });
  }, [input.initialNotes]);

  function setNotes(next: StickyNote[] | ((prev: StickyNote[]) => StickyNote[])) {
    setNotesState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (!input.readOnly) onChange?.(resolved);
      return resolved;
    });
  }

  return useStickyBoardController({
    currentUser: input.currentUser,
    readOnly: input.readOnly ?? false,
    storage: {
      notes,
      addNote: (note) => setNotes((existing) => [...existing, note]),
      patchNote: (id, patch) => setNotes((existing) => updateStickyNote(existing, id, patch)),
    },
  });
}
