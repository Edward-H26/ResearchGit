"use client";

import type { StickyNote } from "@/lib/canvas/schema";
import { useState, useTransition } from "react";
import { acceptRevisionAction, requestRevisionAction } from "./actions";

export type ReviseDialogProps = {
  ideaId: string;
  notes: ReadonlyArray<StickyNote>;
  open: boolean;
  onClose: () => void;
  onAccepted?: () => void;
};

export function ReviseDialog({ ideaId, notes, open, onClose, onAccepted }: ReviseDialogProps) {
  const [intent, setIntent] = useState("");
  const [preview, setPreview] = useState<{ revisedMarkdown: string; changelog: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function reset() {
    setIntent("");
    setPreview(null);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await requestRevisionAction({
        ideaId,
        intent,
        notes: notes.map((n) => ({
          text: n.text,
          intent: n.intent,
          authorHandle: n.authorHandle,
        })),
      });
      if (!result.ok) setError(result.error);
      else setPreview({ revisedMarkdown: result.revisedMarkdown, changelog: result.changelog });
    });
  }

  function accept() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const result = await acceptRevisionAction({
        ideaId,
        revisedMarkdown: preview.revisedMarkdown,
        changelog: preview.changelog,
        revisionIntent: intent,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        reset();
        if (onAccepted) onAccepted();
        else onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Revise this idea with AI</h2>
          <p className="mt-1 text-xs text-neutral-500">
            The model receives the current idea text, all sticky-note feedback, and your revision
            intent below. You preview the result before it becomes a new version.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!preview ? (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  Sticky notes considered ({notes.length})
                </p>
                {notes.length === 0 ? (
                  <p className="mt-2 rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
                    No sticky notes on the canvas yet. The AI will revise based on your intent and
                    the current proposal alone.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                    {notes.map((note) => (
                      <li
                        key={note.id}
                        className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs"
                      >
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            note.intent === "add"
                              ? "bg-emerald-100 text-emerald-800"
                              : note.intent === "delete"
                                ? "bg-red-100 text-red-800"
                                : "bg-violet-100 text-violet-800"
                          }`}
                        >
                          {note.intent}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-neutral-700">
                            {note.text.trim() || (
                              <span className="italic text-neutral-400">(empty)</span>
                            )}
                          </p>
                          <p className="text-[10px] text-neutral-500">by {note.authorHandle}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <label className="block text-sm font-medium text-neutral-800">
                Your revision intent
                <textarea
                  value={intent}
                  onChange={(event) => setIntent(event.target.value)}
                  rows={6}
                  placeholder="Example: tighten the research question and emphasise the methodological contribution."
                  className="mt-2 w-full resize-vertical rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-neutral-950"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  Changelog
                </p>
                <p className="mt-1 text-sm text-neutral-800">{preview.changelog}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  Proposed revision
                </p>
                <article className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-800">
                  {preview.revisedMarkdown}
                </article>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="text-xs text-neutral-500 underline-offset-4 transition hover:text-neutral-900 hover:underline disabled:opacity-50"
          >
            Cancel
          </button>
          {!preview ? (
            <button
              type="button"
              onClick={submit}
              disabled={pending || intent.trim().length === 0}
              className="rounded-2xl bg-neutral-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Calling AI…" : "Generate revision"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={pending}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={accept}
                disabled={pending}
                className="rounded-2xl bg-neutral-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Accept as new version"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
