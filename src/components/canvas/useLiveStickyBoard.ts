"use client";

import type { StickyNote } from "@/lib/canvas/schema";
import type { CanvasUser } from "@/lib/canvas/types";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { useStickyBoardController } from "./useStickyBoardController";

export type UseLiveStickyBoardInput = {
  currentUser: CanvasUser;
};

export function useLiveStickyBoard(input: UseLiveStickyBoardInput) {
  const notes = useStorage((root) => root.notes) ?? [];

  const appendNote = useMutation(({ storage }, note: StickyNote) => {
    storage.get("notes").push(note);
  }, []);

  const patchStoredNote = useMutation(({ storage }, id: string, patch: Partial<StickyNote>) => {
    const notesList = storage.get("notes");
    const index = notesList.findIndex((note) => note.id === id);
    if (index < 0) return;
    const current = notesList.get(index);
    if (!current) return;
    notesList.set(index, { ...current, ...patch });
  }, []);

  const deleteStoredNote = useMutation(({ storage }, id: string) => {
    const notesList = storage.get("notes");
    const index = notesList.findIndex((note) => note.id === id);
    if (index >= 0) {
      notesList.delete(index);
    }
  }, []);

  const clearStoredNotes = useMutation(({ storage }) => {
    storage.get("notes").clear();
  }, []);

  return useStickyBoardController({
    currentUser: input.currentUser,
    storage: {
      notes,
      addNote: appendNote,
      patchNote: patchStoredNote,
      deleteNote: deleteStoredNote,
      clearNotes: clearStoredNotes,
    },
  });
}
