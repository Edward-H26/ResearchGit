"use client";

import { StickyNotesBoard } from "@/components/canvas";
import type { StickyNote } from "@/lib/canvas";
import {
  type DraftEnhancementPreview,
  THEME_DISPLAY_DEFINITIONS,
  UNGROUPED_THEME_INDEX,
  applyThemesToNotes,
  generateIdeaCards,
  previewDraftEnhancement,
  synthesizeIdeaFromNotes,
} from "@/lib/ideas";
import {
  type IdeaVersionTrigger,
  createIdeaFromCard,
  getIdeaById,
  publishIdea,
  restoreDraftVersion,
  saveDraftVersion,
  saveIdeaNotes,
  subscribeToIdeaStore,
} from "@/lib/ideas/client-store";
import { parseIdeaList } from "@/lib/ideas/fields";
import { type IdeaFields, type IdeaRecord, ideaRecordToCard } from "@/lib/ideas/store";
import { getAuthorByName, getPaperById } from "@/lib/papers/catalog";
import { dashboardHref, ideaHref } from "@/lib/routes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type IdeaDraftClientProps = {
  ideaId: string;
  authorName: string | null;
};

const QUICK_AI_ACTIONS = ["Strengthen method", "Sharpen title", "Tighten novelty"] as const;

function toIdeaFields(idea: IdeaRecord): IdeaFields {
  const synthesis = synthesizeIdeaFromNotes(ideaRecordToCard(idea), idea.notes);
  return {
    title: synthesis.title,
    hypothesis: synthesis.hypothesis,
    methodology: synthesis.methodology,
    novelty: synthesis.novelty,
    citations: synthesis.citations,
  };
}

export function IdeaDraftClient({ ideaId, authorName }: IdeaDraftClientProps) {
  const router = useRouter();
  const author = authorName ? getAuthorByName(authorName) : null;
  const [ready, setReady] = useState(false);
  const [idea, setIdea] = useState<IdeaRecord | null>(null);
  const [boardRevision, setBoardRevision] = useState(0);
  const [themeLabelsVisible, setThemeLabelsVisible] = useState(false);
  const [publishFields, setPublishFields] = useState<IdeaFields | null>(null);
  const [isEnhanceOpen, setIsEnhanceOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [quickIntent, setQuickIntent] = useState<(typeof QUICK_AI_ACTIONS)[number]>(
    QUICK_AI_ACTIONS[0],
  );
  const [customIntent, setCustomIntent] = useState("");
  const [enhancementPreview, setEnhancementPreview] = useState<DraftEnhancementPreview | null>(
    null,
  );
  const [enhancementTrigger, setEnhancementTrigger] =
    useState<IdeaVersionTrigger>("ai_quick_action");
  const latestNotesRef = useRef<ReadonlyArray<StickyNote>>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<Promise<IdeaRecord | null> | null>(null);
  const currentIdeaId = idea?.id ?? null;
  const themeLabels =
    themeLabelsVisible && idea
      ? THEME_DISPLAY_DEFINITIONS.filter((theme) =>
          idea.notes.some((note) => note.themeIndex === theme.index),
        ).map((theme) => ({
          ...theme,
          isUngrouped: theme.index === UNGROUPED_THEME_INDEX,
        }))
      : [];

  useEffect(() => {
    let canceled = false;

    async function loadDraft() {
      if (!author) {
        setReady(true);
        return;
      }

      const existing = await getIdeaById(ideaId);
      if (canceled) return;
      if (existing && existing.ownerName === author.name && existing.status === "draft") {
        setIdea(existing);
        setThemeLabelsVisible(existing.notes.some((note) => note.themeIndex !== null));
        setReady(true);
        return;
      }
      if (existing) {
        setIdea(null);
        setReady(true);
        return;
      }

      const fallbackCard =
        generateIdeaCards([], author.name).find((card) => card.id === ideaId) ??
        (getPaperById(ideaId) ? generateIdeaCards([ideaId], author.name)[0] : null);
      if (fallbackCard) {
        const created = await createIdeaFromCard(fallbackCard, author.name);
        if (!created || canceled) return;
        router.replace(ideaHref(created.id, created.status, author.name));
        setIdea(created.status === "draft" ? created : null);
      }
      setReady(true);
    }

    void loadDraft();
    const unsubscribe = subscribeToIdeaStore(async () => {
      const current = await getIdeaById(ideaId);
      if (
        !canceled &&
        current &&
        current.ownerName === author?.name &&
        current.status === "draft"
      ) {
        setIdea(current);
      }
    });

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [ideaId, author, router]);

  useEffect(() => {
    if (idea) latestNotesRef.current = idea.notes;
  }, [idea]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const persistNotes = useCallback(
    (ideaId: string, notes: ReadonlyArray<StickyNote>) => {
      const request = saveIdeaNotes(ideaId, notes, author?.name).then((updated) => {
        if (updated) setIdea(updated);
        return updated;
      });
      const tracked = request.finally(() => {
        if (saveInFlightRef.current === tracked) saveInFlightRef.current = null;
      });
      saveInFlightRef.current = tracked;
      return tracked;
    },
    [author?.name],
  );

  const saveNotes = useCallback(
    (notes: ReadonlyArray<StickyNote>) => {
      if (!currentIdeaId) return;
      latestNotesRef.current = notes;
      setIdea((current) =>
        current?.id === currentIdeaId
          ? { ...current, notes: [...notes], updatedAt: new Date().toISOString() }
          : current,
      );
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void persistNotes(currentIdeaId, latestNotesRef.current);
      }, 250);
    },
    [currentIdeaId, persistNotes],
  );

  async function suggestThemes() {
    if (!idea || !author) return;
    const themedNotes = applyThemesToNotes(latestNotesRef.current);
    latestNotesRef.current = themedNotes;
    setIdea({ ...idea, notes: themedNotes, updatedAt: new Date().toISOString() });
    setThemeLabelsVisible(true);
    setBoardRevision((value) => value + 1);
    const updated = await saveIdeaNotes(idea.id, themedNotes, author.name);
    if (updated) {
      setIdea(updated);
    }
  }

  function openPublishModal() {
    if (!idea) return;
    setPublishFields(toIdeaFields({ ...idea, notes: [...latestNotesRef.current] }));
  }

  function openEnhanceModal() {
    setEnhancementPreview(null);
    setIsEnhanceOpen(true);
  }

  function generateEnhancementPreview() {
    if (!idea) return;
    const trimmedCustom = customIntent.trim();
    const intent = trimmedCustom.length > 0 ? trimmedCustom : quickIntent;
    const trigger: IdeaVersionTrigger =
      trimmedCustom.length > 0 ? "ai_custom_prompt" : "ai_quick_action";
    setEnhancementTrigger(trigger);
    setEnhancementPreview(
      previewDraftEnhancement({
        idea,
        notes: latestNotesRef.current,
        intent,
        trigger,
      }),
    );
  }

  async function acceptEnhancement() {
    if (!idea || !author || !enhancementPreview) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (saveInFlightRef.current) await saveInFlightRef.current;
    const updated = await saveDraftVersion(
      idea.id,
      enhancementPreview.fields,
      enhancementPreview.notes,
      enhancementTrigger,
      enhancementPreview.summary,
      author.name,
    );
    if (!updated) return;
    latestNotesRef.current = updated.notes;
    setIdea(updated);
    setBoardRevision((value) => value + 1);
    setIsEnhanceOpen(false);
    setEnhancementPreview(null);
  }

  async function restoreVersion(versionId: string) {
    if (!idea || !author) return;
    const updated = await restoreDraftVersion(idea.id, versionId, author.name);
    if (!updated) return;
    latestNotesRef.current = updated.notes;
    setIdea(updated);
    setBoardRevision((value) => value + 1);
    setIsVersionsOpen(false);
  }

  async function confirmPublish() {
    if (!idea || !publishFields || !author) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (saveInFlightRef.current) await saveInFlightRef.current;
    const updated = await publishIdea(idea.id, publishFields, author.name, latestNotesRef.current);
    if (!updated) return;
    router.push(ideaHref(updated.id, updated.status, author.name));
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-100 p-6">
        <p className="text-sm font-semibold text-neutral-500">Loading draft</p>
      </main>
    );
  }

  if (!author || !idea) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-100 p-6">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25]">
          <h1 className="text-2xl font-semibold">Draft not found</h1>
          <p className="mt-3 text-sm leading-relaxed">
            This draft is available only to its matched author while it is still private.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#8c3f25]"
          >
            Return to sign-in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-neutral-100">
      <header
        data-draft-header="true"
        className="shrink-0 border-b border-neutral-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Draft canvas
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-neutral-950">
              {idea.title}
            </h1>
          </div>
          <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            <Link
              href={dashboardHref(author.name)}
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={openEnhanceModal}
              className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              Enhance with AI
            </button>
            <button
              type="button"
              onClick={() => void suggestThemes()}
              className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              AI suggested themes
            </button>
            <button
              type="button"
              onClick={() => setIsVersionsOpen(true)}
              className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              Versions {idea.versions.length}
            </button>
            <button
              type="button"
              onClick={openPublishModal}
              className="col-span-2 rounded-full bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:col-span-1"
            >
              Publish to marketplace
            </button>
          </div>
        </div>
        <div className="mt-2 flex max-h-20 flex-wrap gap-2 overflow-y-auto">
          {themeLabelsVisible
            ? themeLabels.map((theme) => (
                <span
                  key={theme.index}
                  className="rounded-full bg-[#f4e6c5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6f5210]"
                >
                  {theme.isUngrouped ? "Ungrouped" : `AI theme ${theme.index + 1}`}: {theme.label}
                </span>
              ))
            : null}
        </div>
      </header>

      <div className="min-h-0 flex-1" data-draft-board-shell="true">
        <StickyNotesBoard
          key={`${idea.id}-${boardRevision}`}
          currentUser={{ id: author.id, handle: author.name }}
          initialNotes={idea.notes}
          themeLabels={themeLabels}
          boardSubtitle="Live shared draft canvas"
          onChange={saveNotes}
        />
      </div>

      {isEnhanceOpen ? (
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
                        onClick={() => {
                          setQuickIntent(action);
                          setCustomIntent("");
                          setEnhancementPreview(null);
                        }}
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
                    onChange={(event) => {
                      setCustomIntent(event.target.value);
                      setEnhancementPreview(null);
                    }}
                    rows={5}
                    placeholder="Tell the AI how to revise this draft"
                    className="w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
                  />
                </label>
                <button
                  type="button"
                  onClick={generateEnhancementPreview}
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
                        onClick={() => void acceptEnhancement()}
                        className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                      >
                        Accept enhancement
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnhancementPreview(null)}
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
                onClick={() => setIsEnhanceOpen(false)}
                className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isVersionsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 sm:p-5">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Draft versions
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Version history
            </h2>
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
                    <article
                      key={version.id}
                      className="rounded-[22px] border border-neutral-200 p-4"
                    >
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
                          onClick={() => void restoreVersion(version.id)}
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
                onClick={() => setIsVersionsOpen(false)}
                className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {publishFields ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 sm:p-5">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Publish modal
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Review synthesis
            </h2>
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Title
                </span>
                <input
                  value={publishFields.title}
                  onChange={(event) =>
                    setPublishFields({ ...publishFields, title: event.target.value })
                  }
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Hypothesis
                </span>
                <textarea
                  value={publishFields.hypothesis}
                  onChange={(event) =>
                    setPublishFields({ ...publishFields, hypothesis: event.target.value })
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Methodology
                </span>
                <textarea
                  value={publishFields.methodology}
                  onChange={(event) =>
                    setPublishFields({ ...publishFields, methodology: event.target.value })
                  }
                  rows={7}
                  className="w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Novelty
                </span>
                <textarea
                  value={publishFields.novelty.join("\n")}
                  onChange={(event) =>
                    setPublishFields({
                      ...publishFields,
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
                  {publishFields.citations.map((citation) => (
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
                onClick={() => void confirmPublish()}
                className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Publish
              </button>
              <button
                type="button"
                onClick={() => setPublishFields(null)}
                className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
