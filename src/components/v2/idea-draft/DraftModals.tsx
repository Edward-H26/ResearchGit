"use client";

import type { DraftEnhancementPreview } from "@/lib/ideas";
import { parseIdeaList } from "@/lib/ideas/fields";
import type { IdeaFields, IdeaRecord } from "@/lib/ideas/store";

export const QUICK_AI_ACTIONS = ["Strengthen method", "Sharpen title", "Tighten novelty"] as const;

export type QuickAiAction = (typeof QUICK_AI_ACTIONS)[number];

type DraftEnhanceModalProps = {
  quickIntent: QuickAiAction;
  customIntent: string;
  enhancementPreview: DraftEnhancementPreview | null;
  onQuickIntentChange: (intent: QuickAiAction) => void;
  onCustomIntentChange: (intent: string) => void;
  onGeneratePreview: () => void;
  onAcceptEnhancement: () => void;
  onRejectEnhancement: () => void;
  onClose: () => void;
};

type DraftVersionsModalProps = {
  idea: IdeaRecord;
  onRestoreVersion: (versionId: string) => void;
  onClose: () => void;
};

type DraftPublishModalProps = {
  fields: IdeaFields;
  onFieldsChange: (fields: IdeaFields) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function DraftEnhanceModal({
  quickIntent,
  customIntent,
  enhancementPreview,
  onQuickIntentChange,
  onCustomIntentChange,
  onGeneratePreview,
  onAcceptEnhancement,
  onRejectEnhancement,
  onClose,
}: DraftEnhanceModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 sm:p-5">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
          AI draft assistant
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Enhance draft with AI
        </h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Quick actions
              </p>
              <div className="mt-3 grid gap-2">
                {QUICK_AI_ACTIONS.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onQuickIntentChange(action)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      quickIntent === action && customIntent.trim().length === 0
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-950"
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Custom prompt
              </span>
              <textarea
                value={customIntent}
                onChange={(event) => onCustomIntentChange(event.target.value)}
                rows={5}
                placeholder="Tell the AI how to revise this draft"
                className="w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
              />
            </label>
            <button
              type="button"
              onClick={onGeneratePreview}
              className="w-full rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Generate suggestion
            </button>
          </div>

          <div className="min-h-[320px] rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4">
            {enhancementPreview ? (
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Proposed AI version</h3>
                <p className="mt-2 text-sm font-semibold text-neutral-600">
                  {enhancementPreview.summary}
                </p>
                <div className="mt-4 grid gap-3 text-sm text-neutral-700">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                      Hypothesis
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {enhancementPreview.fields.hypothesis}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                      Methodology
                    </p>
                    <p className="mt-1 line-clamp-6 whitespace-pre-wrap">
                      {enhancementPreview.fields.methodology}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                      New sticky
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {enhancementPreview.notes.at(-1)?.text}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onAcceptEnhancement}
                    className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Accept enhancement
                  </button>
                  <button
                    type="button"
                    onClick={onRejectEnhancement}
                    className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
                  >
                    Reject suggestion
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-[300px] place-items-center rounded-[20px] bg-white p-6 text-center text-sm leading-relaxed text-neutral-500">
                Choose a quick action or enter a custom prompt to preview an AI revision before
                accepting it into the draft.
              </div>
            )}
          </div>
        </div>
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export function DraftVersionsModal({ idea, onRestoreVersion, onClose }: DraftVersionsModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 sm:p-5">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Draft versions
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Version history</h2>
        <div className="mt-5 grid gap-3">
          {idea.versions.length === 0 ? (
            <p className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              No saved versions yet.
            </p>
          ) : (
            idea.versions
              .slice()
              .reverse()
              .map((version) => (
                <article key={version.id} className="rounded-[22px] border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{version.summary}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                        {version.trigger.replaceAll("_", " ")} ·{" "}
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestoreVersion(version.id)}
                      className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950"
                    >
                      Restore version
                    </button>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-600">
                    {version.fields.methodology}
                  </p>
                </article>
              ))
          )}
        </div>
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export function DraftPublishModal({
  fields,
  onFieldsChange,
  onConfirm,
  onClose,
}: DraftPublishModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 sm:p-5">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Publish modal
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Review synthesis</h2>
        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Title
            </span>
            <input
              value={fields.title}
              onChange={(event) => onFieldsChange({ ...fields, title: event.target.value })}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Hypothesis
            </span>
            <textarea
              value={fields.hypothesis}
              onChange={(event) => onFieldsChange({ ...fields, hypothesis: event.target.value })}
              rows={4}
              className="w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Methodology
            </span>
            <textarea
              value={fields.methodology}
              onChange={(event) => onFieldsChange({ ...fields, methodology: event.target.value })}
              rows={7}
              className="w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Novelty
            </span>
            <textarea
              value={fields.novelty.join("\n")}
              onChange={(event) =>
                onFieldsChange({
                  ...fields,
                  novelty: parseIdeaList(event.target.value),
                })
              }
              rows={4}
              className="w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
            />
          </label>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Grounding
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {fields.citations.map((citation) => (
                <span
                  key={citation}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
                >
                  {citation}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
