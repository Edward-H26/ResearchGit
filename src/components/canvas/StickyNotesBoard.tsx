"use client";

import {
  STICKY_NOTE_ENHANCEMENT_OPTIONS,
  type StickyNoteEnhancementOptionId,
  enhanceStickyNoteText,
} from "@/lib/canvas/ai-enhance";
import { BOARD_HEIGHT, BOARD_WIDTH } from "@/lib/canvas/constants";
import type { StickyNote } from "@/lib/canvas/schema";
import { stickyBgClass } from "@/lib/canvas/theme-styles";
import type { CanvasUser, ResizeCorner } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";
import { type WheelEvent, useCallback, useState } from "react";
import { Icon } from "./icons";
import { useStickyBoard } from "./useStickyBoard";

export type StickyThemeLabel = {
  index: number;
  label: string;
  compactLabel?: string;
  colorToken: string;
  isUngrouped?: boolean;
};

const EMPTY_NOTES: ReadonlyArray<StickyNote> = [];
const EMPTY_THEME_LABELS: ReadonlyArray<StickyThemeLabel> = [];
const THEME_GROUP_LABEL_GAP = 18;
const RESIZE_CORNERS: ReadonlyArray<{
  corner: ResizeCorner;
  label: string;
  className: string;
}> = [
  { corner: "nw", label: "top-left", className: "left-0 top-0 cursor-nwse-resize" },
  { corner: "ne", label: "top-right", className: "right-0 top-0 cursor-nesw-resize" },
  { corner: "sw", label: "bottom-left", className: "bottom-0 left-0 cursor-nesw-resize" },
  { corner: "se", label: "bottom-right", className: "bottom-0 right-0 cursor-nwse-resize" },
];

export type StickyNotesBoardProps = {
  currentUser: CanvasUser;
  initialNotes?: ReadonlyArray<StickyNote>;
  themeLabels?: ReadonlyArray<StickyThemeLabel>;
  boardTitle?: string;
  boardSubtitle?: string;
  onChange?: (notes: ReadonlyArray<StickyNote>) => void;
  readOnly?: boolean;
};

export function StickyNotesBoard({
  currentUser,
  initialNotes = EMPTY_NOTES,
  themeLabels = EMPTY_THEME_LABELS,
  boardTitle = "Sticky board",
  boardSubtitle = "Private draft canvas",
  onChange,
  readOnly = false,
}: StickyNotesBoardProps) {
  const board = useStickyBoard({
    currentUser,
    initialNotes,
    onChange,
    readOnly,
  });

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [enhancingNoteId, setEnhancingNoteId] = useState<string | null>(null);
  const [enhancementOptionId, setEnhancementOptionId] =
    useState<StickyNoteEnhancementOptionId>("clarity");
  const sidebarNotes = board.visibleNotes.slice(0, 3);
  const selectedNote = board.notes.find((note) => note.id === board.selectedId) ?? null;
  const enhancingNote = board.notes.find((note) => note.id === enhancingNoteId) ?? null;
  const enhancedStickyText = enhancingNote
    ? enhanceStickyNoteText(enhancingNote.text, enhancementOptionId, boardTitle)
    : "";
  const stickyThemeLabelByIndex = new Map(
    themeLabels.map((theme) => [theme.index, theme.compactLabel ?? theme.label]),
  );
  const themeGroups = themeLabels.flatMap((theme) => {
    const notesInTheme = board.notes.filter((note) => note.themeIndex === theme.index);
    if (notesInTheme.length === 0) return [];
    const minX = Math.min(...notesInTheme.map((note) => note.x));
    const minY = Math.min(...notesInTheme.map((note) => note.y));
    const maxX = Math.max(...notesInTheme.map((note) => note.x + note.width));
    return [
      {
        ...theme,
        count: notesInTheme.length,
        x: minX,
        y: Math.max(24, minY - THEME_GROUP_LABEL_GAP),
        width: Math.max(250, maxX - minX),
      },
    ];
  });

  const focusInlineEditor = useCallback((editor: HTMLTextAreaElement | null) => {
    if (!editor) return;
    editor.focus();
    const end = editor.value.length;
    editor.setSelectionRange(end, end);
  }, []);

  const stopWheelForScrollableNote = useCallback((event: WheelEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const canScrollDown =
      event.deltaY > 0 && element.scrollTop + element.clientHeight < element.scrollHeight;
    const canScrollUp = event.deltaY < 0 && element.scrollTop > 0;
    const canScrollRight =
      event.deltaX > 0 && element.scrollLeft + element.clientWidth < element.scrollWidth;
    const canScrollLeft = event.deltaX < 0 && element.scrollLeft > 0;

    if (canScrollDown || canScrollUp || canScrollRight || canScrollLeft) {
      event.stopPropagation();
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-neutral-100 text-neutral-950 md:flex-row">
      <aside className="z-20 flex max-h-64 w-full shrink-0 flex-col border-b border-neutral-200 bg-white/95 shadow-xl shadow-neutral-200/70 backdrop-blur md:h-full md:max-h-none md:w-[310px] md:border-b-0 md:border-r">
        <div className="border-b border-neutral-200 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-950 text-white shadow-md">
              <Icon name="note" size={23} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">{boardTitle}</h1>
              <p className="text-sm text-neutral-500">{boardSubtitle}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-5">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              {readOnly ? "Canvas mode" : "Create"}
            </p>
            {readOnly ? (
              <p
                data-readonly-board-notice="true"
                className="rounded-2xl bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-500"
              >
                This published canvas is read-only for contributors. Add feedback in the comment
                composer instead.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  data-toolbar="true"
                  onClick={() => board.addNote()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  <Icon name="plus" size={18} /> Add sticky note
                </button>
                <p className="text-xs leading-relaxed text-neutral-500">
                  Double-click anywhere on the board to create a note at that position. Drag the
                  board background to move the canvas.
                </p>
              </>
            )}
          </section>

          {!readOnly ? (
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                AI assist
              </p>
              <button
                type="button"
                data-toolbar="true"
                disabled={!selectedNote}
                onClick={() => {
                  if (!selectedNote) return;
                  setEnhancingNoteId(selectedNote.id);
                  setEnhancementOptionId("clarity");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 disabled:border-neutral-200 disabled:text-neutral-300"
              >
                <Icon name="note" size={18} /> Enhance sticky with AI
              </button>
              <p className="text-xs leading-relaxed text-neutral-500">
                Select a sticky to refine its wording, evidence, method detail, or contribution
                framing.
              </p>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Notes
              </p>
              <span className="text-xs text-neutral-400">{sidebarNotes.length}</span>
            </div>
            <input
              type="search"
              value={board.search}
              onChange={(event) => board.setSearch(event.target.value)}
              placeholder="Search notes"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
            />
            <div className="space-y-2">
              {board.visibleNotes.length === 0 ? (
                <p className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                  No notes match the current search.
                </p>
              ) : (
                sidebarNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    data-sidebar-note="true"
                    data-toolbar="true"
                    onClick={() => board.focusNote(note.id)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left transition",
                      board.selectedId === note.id
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{note.authorHandle}</span>
                      {note.themeIndex !== null ? (
                        <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">
                          {stickyThemeLabelByIndex.get(note.themeIndex) ??
                            `theme ${note.themeIndex + 1}`}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm opacity-80">
                      {note.text.trim() || "Untitled note"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>

      <div
        ref={board.boardRef}
        data-board-viewport="true"
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.04)_1px,_transparent_1px)] bg-[size:24px_24px]",
          board.drag?.type === "pan" ? "cursor-grabbing" : "cursor-grab",
        )}
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
          {themeGroups.map((theme) => (
            <div
              key={theme.index}
              data-theme-group-label="true"
              className={cn(
                "absolute rounded-2xl border border-black/10 px-4 py-3 shadow-lg shadow-neutral-200/60",
                stickyBgClass(theme.colorToken),
              )}
              style={{
                left: theme.x,
                top: theme.y,
                width: Math.max(250, theme.width),
                zIndex: 2,
                transform: "translateY(-100%)",
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-700/70">
                {theme.isUngrouped ? "Ungrouped" : `AI suggested theme ${theme.index + 1}`}
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-950">{theme.label}</p>
              <p className="mt-1 text-xs text-neutral-700">{theme.count} notes</p>
            </div>
          ))}
          {board.notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const isSelected = board.selectedId === note.id;

            return (
              <article
                key={note.id}
                data-sticky-note="true"
                aria-label={`Sticky note by ${note.authorHandle}`}
                onPointerDown={(event) => board.beginNoteDrag(event, note)}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (readOnly) return;
                  board.setSelectedId(note.id);
                  setEditingNoteId(note.id);
                }}
                className={cn(
                  "absolute overflow-hidden rounded-[22px] border border-black/10 p-4 text-left shadow-xl transition-shadow focus:outline-none",
                  stickyBgClass(note.themeColorToken),
                  isSelected ? "ring-2 ring-neutral-950" : "hover:ring-2 hover:ring-neutral-400/70",
                  readOnly
                    ? "cursor-default"
                    : board.drag?.type === "note" && board.drag.id === note.id
                      ? "cursor-grabbing"
                      : "cursor-grab",
                )}
                style={{
                  left: note.x,
                  top: note.y,
                  width: note.width,
                  height: note.height,
                  rotate: `${note.rotation}deg`,
                  zIndex: isSelected || isEditing ? 5 : 1,
                }}
              >
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex shrink-0 items-start justify-between gap-3 overflow-hidden">
                    {note.themeIndex !== null ? (
                      <span className="min-w-0 flex-1 break-words text-[10px] font-semibold uppercase leading-tight tracking-[0.04em] text-neutral-800/70">
                        {stickyThemeLabelByIndex.get(note.themeIndex) ??
                          `theme ${note.themeIndex + 1}`}
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1" />
                    )}
                    <span className="max-w-[46%] shrink-0 break-words text-right text-[11px] leading-tight text-neutral-800/70">
                      {note.authorHandle}
                    </span>
                  </div>
                  {isEditing ? (
                    <textarea
                      ref={focusInlineEditor}
                      value={note.text}
                      data-toolbar="true"
                      onPointerDown={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onWheel={stopWheelForScrollableNote}
                      onChange={(event) =>
                        board.patchNote(note.id, { text: event.target.value }, "sticky.text_edited")
                      }
                      onBlur={() => setEditingNoteId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setEditingNoteId(null);
                        }
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          setEditingNoteId(null);
                        }
                      }}
                      className="mt-3 min-h-0 flex-1 resize-none overflow-y-auto bg-transparent pr-1 text-sm leading-relaxed text-neutral-950 outline-none"
                    />
                  ) : (
                    <div
                      data-sticky-note-body="true"
                      onWheel={stopWheelForScrollableNote}
                      className="mt-3 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap pr-1 text-sm leading-relaxed text-neutral-950"
                    >
                      {note.text.trim() || "Untitled note"}
                    </div>
                  )}
                </div>
                {readOnly
                  ? null
                  : RESIZE_CORNERS.map((handle) => (
                      <button
                        key={handle.corner}
                        type="button"
                        data-toolbar="true"
                        data-sticky-resize-handle="true"
                        data-resize-corner={handle.corner}
                        aria-label={`Resize sticky note from ${handle.label} corner`}
                        onPointerDown={(event) => board.beginNoteResize(event, note, handle.corner)}
                        onClick={(event) => event.stopPropagation()}
                        className={cn(
                          "absolute h-8 w-8 rounded-md bg-transparent p-0 focus:outline-none focus:ring-2 focus:ring-neutral-950/30",
                          handle.className,
                        )}
                      />
                    ))}
              </article>
            );
          })}
        </div>
      </div>

      {enhancingNote ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 sm:p-5">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 text-neutral-950 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Sticky AI assistant
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Enhance sticky note
            </h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Configuration
                </p>
                <div className="mt-3 grid gap-2">
                  {STICKY_NOTE_ENHANCEMENT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setEnhancementOptionId(option.id)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                        enhancementOptionId === option.id
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-950",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Preview
                </p>
                <div className="mt-3 rounded-[20px] bg-white p-4 text-sm leading-relaxed text-neutral-800">
                  <p className="whitespace-pre-wrap">{enhancedStickyText}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  board.patchNote(
                    enhancingNote.id,
                    { text: enhancedStickyText },
                    "sticky.text_edited",
                  );
                  setEnhancingNoteId(null);
                }}
                className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Apply to sticky
              </button>
              <button
                type="button"
                onClick={() => setEnhancingNoteId(null)}
                className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
