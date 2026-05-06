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
  ZOOM_STEP_WHEEL,
  buildStickyNote,
  clampZoom,
  createFallbackBoardPoint,
} from "@/lib/canvas";
import type { StickyNote } from "@/lib/canvas/schema";
import type { BoardMode, CanvasUser, DragState, ResizeCorner } from "@/lib/canvas/types";
import { emitEvent } from "@/lib/telemetry";
import { useEffect, useMemo, useRef, useState } from "react";

type StickyBoardStorage = {
  notes: ReadonlyArray<StickyNote>;
  addNote: (note: StickyNote) => void;
  patchNote: (id: string, patch: Partial<StickyNote>) => void;
};

export type UseStickyBoardControllerInput = {
  currentUser: CanvasUser;
  storage: StickyBoardStorage;
  readOnly?: boolean;
};

function clampNoteDimension(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function useStickyBoardController(input: UseStickyBoardControllerInput) {
  const { currentUser, readOnly = false, storage } = input;
  const boardRef = useRef<HTMLDivElement | null>(null);
  const notes = storage.notes;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<BoardMode>("select");
  const [drag, setDrag] = useState<DragState>(null);
  const dragRef = useRef<DragState>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [pan, setPan] = useState<{ x: number; y: number }>({ ...PAN_DEFAULT });
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

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter(
      (note) =>
        note.text.toLowerCase().includes(query) || note.authorHandle.toLowerCase().includes(query),
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
    if (readOnly) return;
    const point =
      typeof clientX === "number" && typeof clientY === "number"
        ? toBoardPoint(clientX, clientY)
        : createFallbackBoardPoint();
    const next = buildStickyNote({
      point,
      authorUserId: currentUser.id,
      authorHandle: currentUser.handle,
    });
    storage.addNote(next);
    setSelectedId(next.id);
    emitEvent({ kind: "sticky.created", stickyId: next.id });
  }

  function patchNote(id: string, patch: Partial<StickyNote>, eventKind?: "sticky.text_edited") {
    if (readOnly) return;
    storage.patchNote(id, patch);
    if (eventKind) {
      emitEvent({ kind: eventKind, stickyId: id });
    }
  }

  function focusNote(id: string) {
    const note = notes.find((candidate) => candidate.id === id);
    setSelectedId(id);
    const rect = boardRef.current?.getBoundingClientRect();
    if (!note || !rect) return;
    setPan({
      x: Math.round(rect.width / 2 - (note.x + note.width / 2) * zoom),
      y: Math.round(rect.height / 2 - (note.y + note.height / 2) * zoom),
    });
  }

  function setActiveDrag(nextDrag: DragState) {
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }

  function beginPanDrag(event: React.PointerEvent<HTMLElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDrag({
      type: "pan",
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    });
  }

  function onBoardPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const isBoardSurface = target === boardRef.current || target.dataset.boardCanvas === "true";
    if (!isBoardSurface) return;
    setSelectedId(null);

    if (!readOnly && event.detail === 2 && event.button === 0) {
      addNote(event.clientX, event.clientY);
      return;
    }

    if (event.button === 0 || event.button === 1) {
      beginPanDrag(event);
    }
  }

  function beginNoteDrag(event: React.PointerEvent<HTMLElement>, note: StickyNote) {
    const target = event.target as HTMLElement;
    if (event.detail > 1) return;
    if (target.closest("textarea") || target.closest("[data-toolbar]")) return;
    if (readOnly) {
      setSelectedId(note.id);
      return;
    }
    if (mode === "pan" || event.button === 1 || event.altKey) {
      beginPanDrag(event);
      return;
    }
    if (mode !== "select") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toBoardPoint(event.clientX, event.clientY);
    setSelectedId(note.id);
    setActiveDrag({
      type: "note",
      id: note.id,
      offsetX: point.x - note.x,
      offsetY: point.y - note.y,
    });
  }

  function beginNoteResize(
    event: React.PointerEvent<HTMLElement>,
    note: StickyNote,
    corner: ResizeCorner = "se",
  ) {
    if (readOnly) return;
    if (mode !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(note.id);
    setActiveDrag({
      type: "resize",
      id: note.id,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      x: note.x,
      y: note.y,
      width: note.width,
      height: note.height,
    });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const activeDrag = dragRef.current;
    if (!activeDrag) return;
    if (activeDrag.type === "pan") {
      setPan({
        x: activeDrag.panX + event.clientX - activeDrag.startX,
        y: activeDrag.panY + event.clientY - activeDrag.startY,
      });
      return;
    }
    if (activeDrag.type === "resize") {
      const deltaX = (event.clientX - activeDrag.startX) / zoom;
      const deltaY = (event.clientY - activeDrag.startY) / zoom;
      const rawWidth = activeDrag.corner.endsWith("e")
        ? activeDrag.width + deltaX
        : activeDrag.width - deltaX;
      const rawHeight = activeDrag.corner.startsWith("s")
        ? activeDrag.height + deltaY
        : activeDrag.height - deltaY;
      const width = clampNoteDimension(
        rawWidth,
        NOTE_MIN_WIDTH,
        NOTE_MAX_WIDTH,
        NOTE_DEFAULT_WIDTH,
      );
      const height = clampNoteDimension(
        rawHeight,
        NOTE_MIN_HEIGHT,
        NOTE_MAX_HEIGHT,
        NOTE_DEFAULT_HEIGHT,
      );
      patchNote(activeDrag.id, {
        x: activeDrag.corner.endsWith("w")
          ? Math.round(activeDrag.x + activeDrag.width - width)
          : activeDrag.x,
        y: activeDrag.corner.startsWith("n")
          ? Math.round(activeDrag.y + activeDrag.height - height)
          : activeDrag.y,
        width,
        height,
      });
      return;
    }
    const point = toBoardPoint(event.clientX, event.clientY);
    lastDraggedNoteIdRef.current = activeDrag.id;
    patchNote(activeDrag.id, {
      x: Math.round(point.x - activeDrag.offsetX),
      y: Math.round(point.y - activeDrag.offsetY),
    });
  }

  function onPointerUp() {
    if (lastDraggedNoteIdRef.current) {
      emitEvent({ kind: "sticky.moved", stickyId: lastDraggedNoteIdRef.current });
      lastDraggedNoteIdRef.current = null;
    }
    setActiveDrag(null);
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!event.ctrlKey && !event.metaKey) {
      setPan((current) => ({
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
      return;
    }
    const delta = event.deltaY > 0 ? -ZOOM_STEP_WHEEL : ZOOM_STEP_WHEEL;
    setZoom((value) => clampZoom(value + delta));
  }

  return {
    boardRef,
    notes,
    visibleNotes,
    selectedId,
    mode,
    drag,
    zoom,
    pan,
    search,
    boardSize: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    setMode,
    setSearch,
    setSelectedId,
    addNote,
    patchNote,
    focusNote,
    onBoardPointerDown,
    beginNoteDrag,
    beginNoteResize,
    onPointerMove,
    onPointerUp,
    onWheel,
  };
}
