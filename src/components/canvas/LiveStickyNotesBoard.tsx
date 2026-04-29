"use client";

import {
  intentBgClass,
  intentLabel,
  intentList,
  intentSwatchClass,
} from "@/lib/canvas/intent-styles";
import type { StickyNote } from "@/lib/canvas/schema";
import type { CanvasUser } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";
import { useOthers } from "@liveblocks/react/suspense";
import { useEffect } from "react";
import { Icon } from "./icons";
import { useLiveStickyBoard } from "./useLiveStickyBoard";

export type LiveStickyNotesBoardProps = {
  currentUser: CanvasUser;
  onNotesChange?: (notes: ReadonlyArray<StickyNote>) => void;
};

export function LiveStickyNotesBoard({ currentUser, onNotesChange }: LiveStickyNotesBoardProps) {
  const board = useLiveStickyBoard({ currentUser });
  const others = useOthers();

  useEffect(() => {
    if (onNotesChange) onNotesChange(board.notes);
  }, [board.notes, onNotesChange]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-100 text-neutral-950">
      <aside className="z-20 flex w-[310px] shrink-0 flex-col border-r border-neutral-200 bg-white/95 shadow-xl shadow-neutral-200/70 backdrop-blur">
        <div className="border-b border-neutral-200 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-md">
              <Icon name="note" size={23} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Live canvas</h1>
              <p className="text-sm text-neutral-500">Multi-user via Liveblocks</p>
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
                    "flex h-12 flex-col items-center justify-center gap-1 rounded-xl border-2",
                    intentSwatchClass[intent],
                    board.currentIntent === intent || board.selectedNote?.intent === intent
                      ? "border-neutral-950"
                      : "border-white",
                  )}
                >
                  <span className="text-xs font-semibold text-neutral-900">
                    {intentLabel[intent]}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Author
            </p>
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
              {currentUser.handle}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Search
            </p>
            <input
              value={board.search}
              onChange={(event) => board.setSearch(event.target.value)}
              placeholder="Search notes, authors, intents..."
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-950"
            />
          </section>

          {board.selectedNote && (
            <section className="space-y-3 rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Selected
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  aria-label="Sticky note width"
                  value={board.selectedNote.width}
                  min={90}
                  max={360}
                  onChange={(event) =>
                    board.updateSelectedSize("width", Number(event.target.value))
                  }
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-950"
                />
                <input
                  type="number"
                  aria-label="Sticky note height"
                  value={board.selectedNote.height}
                  min={80}
                  max={320}
                  onChange={(event) =>
                    board.updateSelectedSize("height", Number(event.target.value))
                  }
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-950"
                />
              </div>
              <button
                type="button"
                data-toolbar="true"
                onClick={board.deleteSelected}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                <Icon name="trash" size={17} /> Delete selected note
              </button>
            </section>
          )}
        </div>

        <div className="border-t border-neutral-200 p-5">
          <button
            type="button"
            data-toolbar="true"
            onClick={board.clearBoard}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-3 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            <Icon name="trash" size={17} /> Clear board
          </button>
        </div>
      </aside>

      <main className="relative flex-1 overflow-hidden">
        <header className="absolute left-5 right-5 top-5 z-10 flex items-center justify-between rounded-3xl border border-neutral-200 bg-white/90 px-4 py-3 shadow-xl shadow-neutral-200/70 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 md:block">
              Live canvas · {others.length + 1} {others.length === 0 ? "person" : "people"}
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-600">
              {board.visibleNotes.length} {board.visibleNotes.length === 1 ? "note" : "notes"}
            </span>
            <div className="flex -space-x-2">
              {others.slice(0, 3).map((other) => (
                <div
                  key={other.connectionId}
                  className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-blue-600 text-xs font-semibold text-white shadow"
                  title={other.info?.name ?? "Anonymous"}
                >
                  {(other.info?.name ?? "?").slice(0, 1)}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-toolbar="true"
              onClick={board.zoomOut}
              className="rounded-2xl border border-neutral-200 bg-white p-2.5 transition hover:bg-neutral-50"
              aria-label="Zoom out"
            >
              <Icon name="zoomOut" size={18} />
            </button>
            <div className="min-w-16 rounded-2xl bg-neutral-100 px-3 py-2 text-center text-sm font-medium">
              {Math.round(board.zoom * 100)}%
            </div>
            <button
              type="button"
              data-toolbar="true"
              onClick={board.zoomIn}
              className="rounded-2xl border border-neutral-200 bg-white p-2.5 transition hover:bg-neutral-50"
              aria-label="Zoom in"
            >
              <Icon name="zoomIn" size={18} />
            </button>
            <button
              type="button"
              data-toolbar="true"
              onClick={board.resetView}
              className="rounded-2xl border border-neutral-200 bg-white p-2.5 transition hover:bg-neutral-50"
              aria-label="Reset view"
            >
              <Icon name="reset" size={18} />
            </button>
          </div>
        </header>

        <div
          ref={board.boardRef}
          onPointerDown={board.onBoardPointerDown}
          onPointerMove={board.onPointerMove}
          onPointerUp={board.onPointerUp}
          onPointerCancel={board.onPointerUp}
          onWheel={board.onWheel}
          className={cn(
            "h-full w-full overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.08)_1px,transparent_0)] [background-size:28px_28px]",
            board.mode === "pan" || board.drag?.type === "pan" ? "cursor-grab" : "cursor-default",
          )}
        >
          <div
            data-board-canvas="true"
            className="relative origin-top-left"
            style={{
              width: board.boardSize.width,
              height: board.boardSize.height,
              transform: `translate(${board.pan.x}px, ${board.pan.y}px) scale(${board.zoom})`,
            }}
          >
            {board.visibleNotes.map((note) => {
              const selected = board.selectedId === note.id;
              return (
                <button
                  key={note.id}
                  type="button"
                  onPointerDown={(event) => board.beginNoteDrag(event, note)}
                  onClick={() => board.setSelectedId(note.id)}
                  className={cn(
                    "absolute rounded-[22px] border border-black/10 p-4 text-left shadow-xl transition focus:outline-none",
                    intentBgClass[note.intent],
                    selected ? "ring-2 ring-neutral-950" : "hover:ring-2 hover:ring-neutral-400/70",
                    board.drag?.type === "note" && board.drag.id === note.id
                      ? "scale-[1.03] cursor-grabbing"
                      : "cursor-grab",
                  )}
                  style={{
                    left: note.x,
                    top: note.y,
                    width: note.width,
                    height: note.height,
                    rotate: `${note.rotation}deg`,
                    zIndex: selected ? 5 : 1,
                  }}
                >
                  <textarea
                    value={note.text}
                    onChange={(event) =>
                      board.patchNote(note.id, { text: event.target.value }, "sticky.text_edited")
                    }
                    className="h-full w-full resize-none bg-transparent text-center text-lg font-medium leading-snug text-neutral-900 outline-none placeholder:text-neutral-700/60"
                    placeholder="Type your idea..."
                  />
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
