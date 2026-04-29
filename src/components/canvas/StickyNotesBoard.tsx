"use client";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  NOTE_MAX_HEIGHT,
  NOTE_MAX_WIDTH,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
} from "@/lib/canvas/constants";
import {
  intentBgClass,
  intentLabel,
  intentList,
  intentSwatchClass,
} from "@/lib/canvas/intent-styles";
import type { StickyNote } from "@/lib/canvas/schema";
import type { CanvasUser } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";
import { useStickyBoard } from "./useStickyBoard";

const EMPTY_NOTES: ReadonlyArray<StickyNote> = [];

export type StickyNotesBoardProps = {
  currentUser: CanvasUser;
  initialNotes?: ReadonlyArray<StickyNote>;
  onChange?: (notes: ReadonlyArray<StickyNote>) => void;
};

export function StickyNotesBoard({
  currentUser,
  initialNotes = EMPTY_NOTES,
  onChange,
}: StickyNotesBoardProps) {
  const board = useStickyBoard({
    currentUser,
    initialNotes,
    onChange,
  });

  const selectedNoteId = board.selectedNote?.id;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-100 text-neutral-950">
      <aside className="z-20 flex w-[310px] shrink-0 flex-col border-r border-neutral-200 bg-white/95 shadow-xl shadow-neutral-200/70 backdrop-blur">
        <div className="border-b border-neutral-200 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-950 text-white shadow-md">
              <Icon name="note" size={23} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Sticky board</h1>
              <p className="text-sm text-neutral-500">Co-design canvas</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Tools
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-toolbar="true"
                onClick={() => board.setMode("select")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition",
                  board.mode === "select"
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-white hover:bg-neutral-50",
                )}
              >
                <Icon name="pointer" size={17} /> Select
              </button>
              <button
                type="button"
                data-toolbar="true"
                onClick={() => board.setMode("pan")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition",
                  board.mode === "pan"
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-white hover:bg-neutral-50",
                )}
              >
                <Icon name="hand" size={17} /> Pan
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Create
            </p>
            <button
              type="button"
              data-toolbar="true"
              onClick={() => board.addNote()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Icon name="plus" size={18} /> Add sticky note
            </button>
            <p className="text-xs leading-relaxed text-neutral-500">
              Double-click anywhere on the board to create a note at that position. Hold Alt and
              drag, or switch to Pan mode, to move the canvas.
            </p>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Intent
            </p>
            <div className="grid grid-cols-3 gap-2">
              {intentList.map((intent) => (
                <button
                  key={intent}
                  type="button"
                  data-toolbar="true"
                  aria-label={`Set intent to ${intentLabel[intent]}`}
                  onClick={() => board.setIntent(intent)}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center gap-1 rounded-xl border-2 transition",
                    board.currentIntent === intent
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-transparent bg-white hover:border-neutral-200",
                  )}
                >
                  <span className={cn("h-2.5 w-8 rounded-full", intentSwatchClass[intent])} />
                  <span className="text-xs font-medium">{intentLabel[intent]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Notes
              </p>
              <span className="text-xs text-neutral-400">{board.visibleNotes.length}</span>
            </div>
            <input
              type="search"
              value={board.search}
              onChange={(event) => board.setSearch(event.target.value)}
              placeholder="Search notes"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
            />
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {board.visibleNotes.length === 0 ? (
                <p className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                  No notes match the current search.
                </p>
              ) : (
                board.visibleNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    data-toolbar="true"
                    onClick={() => board.setSelectedId(note.id)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left transition",
                      board.selectedId === note.id
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{note.authorHandle}</span>
                      <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">
                        {intentLabel[note.intent]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm opacity-80">
                      {note.text.trim() || "Untitled note"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          {board.selectedNote ? (
            <section className="space-y-3 rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Selected note
                  </p>
                  <p className="mt-1 text-sm font-medium text-neutral-800">
                    {board.selectedNote.authorHandle}
                  </p>
                </div>
                <button
                  type="button"
                  data-toolbar="true"
                  onClick={board.deleteSelected}
                  className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                >
                  <Icon name="trash" size={15} /> Delete
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Text
                </span>
                <textarea
                  value={board.selectedNote.text}
                  onChange={(event) => {
                    if (!selectedNoteId) return;
                    board.patchNote(
                      selectedNoteId,
                      { text: event.target.value },
                      "sticky.text_edited",
                    );
                  }}
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Width
                  </span>
                  <input
                    type="number"
                    min={NOTE_MIN_WIDTH}
                    max={NOTE_MAX_WIDTH}
                    value={board.selectedNote.width}
                    onChange={(event) =>
                      board.updateSelectedSize("width", Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Height
                  </span>
                  <input
                    type="number"
                    min={NOTE_MIN_HEIGHT}
                    max={NOTE_MAX_HEIGHT}
                    value={board.selectedNote.height}
                    onChange={(event) =>
                      board.updateSelectedSize("height", Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
                  />
                </label>
              </div>
            </section>
          ) : null}
        </div>

        <div className="border-t border-neutral-200 p-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-toolbar="true"
              onClick={board.zoomOut}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-medium transition hover:bg-neutral-50"
            >
              <Icon name="zoomOut" size={16} /> Zoom out
            </button>
            <button
              type="button"
              data-toolbar="true"
              onClick={board.zoomIn}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-medium transition hover:bg-neutral-50"
            >
              <Icon name="zoomIn" size={16} /> Zoom in
            </button>
            <button
              type="button"
              data-toolbar="true"
              onClick={board.resetView}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-medium transition hover:bg-neutral-50"
            >
              <Icon name="reset" size={16} /> Reset view
            </button>
            <button
              type="button"
              data-toolbar="true"
              onClick={board.clearBoard}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-medium transition hover:bg-neutral-50"
            >
              <Icon name="trash" size={16} /> Clear board
            </button>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Zoom {Math.round(board.zoom * 100)}% · {board.notes.length} total notes
          </p>
        </div>
      </aside>

      <div
        ref={board.boardRef}
        className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.04)_1px,_transparent_1px)] bg-[size:24px_24px]"
        onPointerDown={board.onBoardPointerDown}
        onPointerMove={board.onPointerMove}
        onPointerUp={board.onPointerUp}
        onPointerCancel={board.onPointerUp}
        onWheel={board.onWheel}
      >
        <div
          data-board-canvas="true"
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `translate(${board.pan.x}px, ${board.pan.y}px) scale(${board.zoom})`,
          }}
        >
          {board.notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onPointerDown={(event) => board.beginNoteDrag(event, note)}
              onClick={() => board.setSelectedId(note.id)}
              className={cn(
                "absolute rounded-[22px] border border-black/10 p-4 text-left shadow-xl transition focus:outline-none",
                intentBgClass[note.intent],
                board.selectedId === note.id
                  ? "ring-2 ring-neutral-950"
                  : "hover:ring-2 hover:ring-neutral-400/70",
              )}
              style={{
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
                rotate: `${note.rotation}deg`,
              }}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-800/70">
                    {intentLabel[note.intent]}
                  </span>
                  <span className="text-[11px] text-neutral-800/70">{note.authorHandle}</span>
                </div>
                <p className="mt-3 line-clamp-[8] whitespace-pre-wrap text-sm leading-relaxed text-neutral-950">
                  {note.text.trim() || "Double-click to add a note, then edit it from the sidebar."}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
