"use client";

import {
  STICKY_NOTE_ENHANCEMENT_OPTIONS,
  type StickyNoteEnhancementOptionId,
} from "@/lib/canvas/ai-enhance";
import type { StickyNote, StickyNoteVersion } from "@/lib/canvas/schema";
import { cn } from "@/lib/utils";

type StickyEnhancementDialogProps = {
  enhancementError: string | null;
  enhancementOptionId: StickyNoteEnhancementOptionId;
  enhancementPreviewText: string;
  isGeneratingEnhancement: boolean;
  note: StickyNote;
  onApply: () => void;
  onCancel: () => void;
  onOptionChange: (optionId: StickyNoteEnhancementOptionId) => void;
  onRestoreVersion: (version: StickyNoteVersion) => void;
};

export function StickyEnhancementDialog({
  enhancementError,
  enhancementOptionId,
  enhancementPreviewText,
  isGeneratingEnhancement,
  note,
  onApply,
  onCancel,
  onOptionChange,
  onRestoreVersion,
}: StickyEnhancementDialogProps) {
  return (
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
                  onClick={() => onOptionChange(option.id)}
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
          <div className="space-y-4">
            <div className="rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Preview
              </p>
              <div className="mt-3 rounded-[20px] bg-white p-4 text-sm leading-relaxed text-neutral-800">
                {isGeneratingEnhancement ? (
                  <p className="text-neutral-500">Generating with ChatGPT...</p>
                ) : enhancementError ? (
                  <p className="text-[#8c3f25]">{enhancementError}</p>
                ) : (
                  <p className="whitespace-pre-wrap">{enhancementPreviewText}</p>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Sticky versions
                </p>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
                  {(note.versions ?? []).length}
                </span>
              </div>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {(note.versions ?? []).length === 0 ? (
                  <p className="rounded-[18px] bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-500">
                    No saved sticky versions yet. Applying an AI enhancement will save the current
                    note and the accepted rewrite here.
                  </p>
                ) : (
                  [...(note.versions ?? [])].reverse().map((version) => (
                    <article
                      key={version.id}
                      className="rounded-[18px] border border-neutral-200 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-neutral-900">{version.label}</p>
                          <p className="mt-1 text-xs capitalize text-neutral-500">
                            {version.source.replaceAll("_", " ")} by {version.authorHandle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRestoreVersion(version)}
                          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950"
                        >
                          Restore
                        </button>
                      </div>
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-neutral-600">
                        {version.text}
                      </p>
                      <p className="mt-2 text-[11px] text-neutral-400">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onApply}
            disabled={isGeneratingEnhancement || !enhancementPreviewText}
            className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            Apply to sticky
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
