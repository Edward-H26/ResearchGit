"use client";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  NOTE_DEFAULT_HEIGHT,
  NOTE_DEFAULT_WIDTH,
  NOTE_MAX_HEIGHT,
  NOTE_MAX_WIDTH,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
  PAN_DEFAULT,
  ZOOM_DEFAULT,
  ZOOM_STEP_BUTTON,
  ZOOM_STEP_WHEEL,
  buildStickyNote,
  clampZoom,
  createFallbackBoardPoint,
} from "@/lib/canvas";
import type { StickyIntent, StickyNote } from "@/lib/canvas/schema";
import type { BoardMode, CanvasUser, DragState } from "@/lib/canvas/types";
import { emitEvent } from "@/lib/telemetry";
import { useEffect, useMemo, useRef, useState } from "react";

type StickyBoardStorage = {
  notes: ReadonlyArray<StickyNote>;
  addNote: (note: StickyNote) => void;
  patchNote: (id: string, patch: Partial<StickyNote>) => void;
  deleteNote: (id: string) => void;
  clearNotes: () => void;
};

export type UseStickyBoardControllerInput = {
  currentUser: CanvasUser;
  storage: StickyBoardStorage;
};

function clampNoteDimension(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function useStickyBoardController(input: UseStickyBoardControllerInput) {
  const { currentUser, storage } = input;
  const boardRef = useRef<HTMLDivElement | null>(null);
  const notes = storage.notes;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<BoardMode>("select");
  const [drag, setDrag] = useState<DragState>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [pan, setPan] = useState<{ x: number; y: number }>({ ...PAN_DEFAULT });
  const [currentIntent, setCurrentIntent] = useState<StickyIntent>("add");
  const [search, setSearch] = useState("");
  const lastDraggedNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    emitEvent({ kind: "canvas.opened" });
    return () => {
      emitEvent({ kind: "canvas.closed" });
    };
  }, []);

  useEffect(() => {
    if (selectedId && !notes.some((note) => note.id === selectedId)) {
      setSelectedId(null);
    }
  }, [notes, selectedId]);

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter(
      (note) =>
        note.text.toLowerCase().includes(query) ||
        note.authorHandle.toLowerCase().includes(query) ||
        note.intent.toLowerCase().includes(query),
    );
  }, [notes, search]);

  function toBoardPoint(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return createFallbackBoardPoint();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  function addNote(clientX?: number, clientY?: number) {
    const point =
      typeof clientX === "number" && typeof clientY === "number"
        ? toBoardPoint(clientX, clientY)
        : createFallbackBoardPoint();
    const next = buildStickyNote({
      point,
      intent: currentIntent,
      authorUserId: currentUser.id,
      authorHandle: currentUser.handle,
    });
    storage.addNote(next);
    setSelectedId(next.id);
    emitEvent({ kind: "sticky.created", stickyId: next.id, payload: { intent: next.intent } });
  }

  function patchNote(id: string, patch: Partial<StickyNote>, eventKind?: "sticky.text_edited") {
    storage.patchNote(id, patch);
    if (eventKind) {
      emitEvent({ kind: eventKind, stickyId: id });
    }
  }

  function setIntent(intent: StickyIntent) {
    setCurrentIntent(intent);
    if (!selectedNote || selectedNote.intent === intent) return;
    patchNote(selectedNote.id, { intent });
    emitEvent({ kind: "sticky.intent_changed", stickyId: selectedNote.id, payload: { intent } });
  }

  function updateSelectedSize(field: "width" | "height", rawValue: number) {
    if (!selectedNote) return;
    const value =
      field === "width"
        ? clampNoteDimension(rawValue, NOTE_MIN_WIDTH, NOTE_MAX_WIDTH, NOTE_DEFAULT_WIDTH)
        : clampNoteDimension(rawValue, NOTE_MIN_HEIGHT, NOTE_MAX_HEIGHT, NOTE_DEFAULT_HEIGHT);
    patchNote(selectedNote.id, { [field]: value });
  }

  function deleteSelected() {
    if (!selectedId) return;
    storage.deleteNote(selectedId);
    emitEvent({ kind: "sticky.deleted", stickyId: selectedId });
    setSelectedId(null);
  }

  function clearBoard() {
    const deletedIds = notes.map((note) => note.id);
    storage.clearNotes();
    setSelectedId(null);
    for (const stickyId of deletedIds) {
      emitEvent({ kind: "sticky.deleted", stickyId });
    }
  }

  function resetView() {
    setZoom(ZOOM_DEFAULT);
    setPan({ ...PAN_DEFAULT });
  }

  function onBoardPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const isBoardSurface = target === boardRef.current || target.dataset.boardCanvas === "true";
    if (!isBoardSurface) return;
    setSelectedId(null);

    if (mode === "pan" || event.button === 1 || event.altKey) {
      setDrag({
        type: "pan",
        startX: event.clientX,
        startY: event.clientY,
        panX: pan.x,
        panY: pan.y,
      });
      return;
    }

    if (event.detail === 2) addNote(event.clientX, event.clientY);
  }

  function beginNoteDrag(event: React.PointerEvent<HTMLElement>, note: StickyNote) {
    if (mode !== "select") return;
    const target = event.target as HTMLElement;
    if (target.closest("textarea") || target.closest("[data-toolbar]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toBoardPoint(event.clientX, event.clientY);
    setSelectedId(note.id);
    setDrag({
      type: "note",
      id: note.id,
      offsetX: point.x - note.x,
      offsetY: point.y - note.y,
    });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    if (drag.type === "pan") {
      setPan({
        x: drag.panX + event.clientX - drag.startX,
        y: drag.panY + event.clientY - drag.startY,
      });
      return;
    }
    const point = toBoardPoint(event.clientX, event.clientY);
    lastDraggedNoteIdRef.current = drag.id;
    patchNote(drag.id, {
      x: Math.round(point.x - drag.offsetX),
      y: Math.round(point.y - drag.offsetY),
    });
  }

  function onPointerUp() {
    if (lastDraggedNoteIdRef.current) {
      emitEvent({ kind: "sticky.moved", stickyId: lastDraggedNoteIdRef.current });
      lastDraggedNoteIdRef.current = null;
    }
    setDrag(null);
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -ZOOM_STEP_WHEEL : ZOOM_STEP_WHEEL;
    setZoom((value) => clampZoom(value + delta));
  }

  return {
    boardRef,
    notes,
    visibleNotes,
    selectedId,
    selectedNote,
    mode,
    drag,
    zoom,
    pan,
    currentIntent,
    search,
    boardSize: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    setMode,
    setSearch,
    setSelectedId,
    setIntent,
    addNote,
    patchNote,
    updateSelectedSize,
    deleteSelected,
    clearBoard,
    resetView,
    onBoardPointerDown,
    beginNoteDrag,
    onPointerMove,
    onPointerUp,
    onWheel,
    zoomOut: () => setZoom((value) => clampZoom(value - ZOOM_STEP_BUTTON)),
    zoomIn: () => setZoom((value) => clampZoom(value + ZOOM_STEP_BUTTON)),
  };
}
