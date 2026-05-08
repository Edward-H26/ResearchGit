"use client";

import type { StickyNote } from "@/lib/canvas";
import type { IdeaRecord } from "@/lib/ideas/store";
import { useCallback, useEffect, useRef } from "react";

type UseDebouncedIdeaNotesInput = {
  delayMs: number;
  localEditGraceMs: number;
  persist: (notes: ReadonlyArray<StickyNote>) => Promise<IdeaRecord | null>;
  applyUpdated: (updated: IdeaRecord) => void;
};

export function useDebouncedIdeaNotes({
  delayMs,
  localEditGraceMs,
  persist,
  applyUpdated,
}: UseDebouncedIdeaNotesInput) {
  const latestNotesRef = useRef<ReadonlyArray<StickyNote>>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<Promise<IdeaRecord | null> | null>(null);
  const lastLocalEditAtRef = useRef(0);

  const hasPendingLocalSave = useCallback(
    () =>
      saveTimerRef.current !== null ||
      saveInFlightRef.current !== null ||
      Date.now() - lastLocalEditAtRef.current < localEditGraceMs,
    [localEditGraceMs],
  );

  const trackRemoteNotes = useCallback((notes: ReadonlyArray<StickyNote>) => {
    latestNotesRef.current = notes;
  }, []);

  const saveNotes = useCallback(
    (notes: ReadonlyArray<StickyNote>) => {
      lastLocalEditAtRef.current = Date.now();
      latestNotesRef.current = notes;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        const requestStartedAt = Date.now();
        const request = persist(latestNotesRef.current).then((updated) => {
          if (updated && requestStartedAt >= lastLocalEditAtRef.current) {
            applyUpdated(updated);
          }
          return updated;
        });
        const tracked = request.finally(() => {
          if (saveInFlightRef.current === tracked) saveInFlightRef.current = null;
        });
        saveInFlightRef.current = tracked;
      }, delayMs);
    },
    [applyUpdated, delayMs, persist],
  );

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const updated = await persist(latestNotesRef.current);
      if (updated) applyUpdated(updated);
      return updated;
    }
    return saveInFlightRef.current ? await saveInFlightRef.current : null;
  }, [applyUpdated, persist]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  return {
    latestNotesRef,
    hasPendingLocalSave,
    trackRemoteNotes,
    saveNotes,
    flushPendingSave,
  };
}
