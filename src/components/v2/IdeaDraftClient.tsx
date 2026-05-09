"use client";

import { StickyNotesBoard } from "@/components/canvas";
import { visibleThemeLabelsForNotes } from "@/components/v2/canvas-theme-labels";
import { useDebouncedIdeaNotes } from "@/components/v2/hooks/useDebouncedIdeaNotes";
import {
  DraftEnhanceModal,
  DraftPublishModal,
  DraftVersionsModal,
  QUICK_AI_ACTIONS,
  type QuickAiAction,
} from "@/components/v2/idea-draft/DraftModals";
import { type StickyNote, buildIdeaStickyEnhancementContext } from "@/lib/canvas";
import {
  type DraftEnhancementPreview,
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
import { withLocalIdeaNotes } from "@/lib/ideas/note-snapshots";
import { ideaRecordToCard } from "@/lib/ideas/store";
import type { IdeaFields, IdeaRecord } from "@/lib/ideas/store-types";
import { getAuthorByName, getPaperById } from "@/lib/papers/catalog";
import { dashboardHref, ideaHref } from "@/lib/routes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type IdeaDraftClientProps = {
  ideaId: string;
  authorName: string | null;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const LOCAL_EDIT_GRACE_MS = 900;

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
  const [quickIntent, setQuickIntent] = useState<QuickAiAction>(QUICK_AI_ACTIONS[0]);
  const [customIntent, setCustomIntent] = useState("");
  const [enhancementPreview, setEnhancementPreview] = useState<DraftEnhancementPreview | null>(
    null,
  );
  const [enhancementTrigger, setEnhancementTrigger] =
    useState<IdeaVersionTrigger>("ai_quick_action");
  const currentIdeaId = idea?.id ?? null;
  const themeLabels = themeLabelsVisible && idea ? visibleThemeLabelsForNotes(idea.notes) : [];
  const draftPaperContext = useMemo(
    () =>
      idea
        ? idea.groundingPaperIds
            .map((paperId) => getPaperById(paperId))
            .filter((paper) => paper !== null)
        : [],
    [idea],
  );
  const stickyEnhancementContext = useMemo(
    () => buildIdeaStickyEnhancementContext({ idea, papers: draftPaperContext }),
    [draftPaperContext, idea],
  );
  const applyUpdatedNotes = useCallback((updated: IdeaRecord) => {
    setIdea(updated);
  }, []);
  const persistNotes = useCallback(
    (notes: ReadonlyArray<StickyNote>) => {
      if (!currentIdeaId) return Promise.resolve(null);
      return saveIdeaNotes(currentIdeaId, notes, author?.name);
    },
    [author?.name, currentIdeaId],
  );
  const {
    latestNotesRef,
    hasPendingLocalSave,
    trackRemoteNotes,
    saveNotes: queueNotesSave,
    flushPendingSave,
  } = useDebouncedIdeaNotes({
    delayMs: NOTE_SAVE_DEBOUNCE_MS,
    localEditGraceMs: LOCAL_EDIT_GRACE_MS,
    persist: persistNotes,
    applyUpdated: applyUpdatedNotes,
  });

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
      if (hasPendingLocalSave()) return;
      const current = await getIdeaById(ideaId);
      if (
        !canceled &&
        current &&
        current.ownerName === author?.name &&
        current.status === "draft"
      ) {
        trackRemoteNotes(current.notes);
        setIdea(current);
      }
    });

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [ideaId, author, hasPendingLocalSave, router, trackRemoteNotes]);

  useEffect(() => {
    if (idea) trackRemoteNotes(idea.notes);
  }, [idea, trackRemoteNotes]);

  const saveNotes = useCallback(
    (notes: ReadonlyArray<StickyNote>) => {
      if (!currentIdeaId) return;
      setIdea((current) => withLocalIdeaNotes(current, currentIdeaId, notes));
      queueNotesSave(notes);
    },
    [currentIdeaId, queueNotesSave],
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
    await flushPendingSave();
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
    await flushPendingSave();
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
          enhancementContext={stickyEnhancementContext}
          onChange={saveNotes}
        />
      </div>

      {isEnhanceOpen ? (
        <DraftEnhanceModal
          quickIntent={quickIntent}
          customIntent={customIntent}
          enhancementPreview={enhancementPreview}
          onQuickIntentChange={(intent) => {
            setQuickIntent(intent);
            setCustomIntent("");
            setEnhancementPreview(null);
          }}
          onCustomIntentChange={(intent) => {
            setCustomIntent(intent);
            setEnhancementPreview(null);
          }}
          onGeneratePreview={generateEnhancementPreview}
          onAcceptEnhancement={() => void acceptEnhancement()}
          onRejectEnhancement={() => setEnhancementPreview(null)}
          onClose={() => setIsEnhanceOpen(false)}
        />
      ) : null}

      {isVersionsOpen ? (
        <DraftVersionsModal
          idea={idea}
          onRestoreVersion={(versionId) => void restoreVersion(versionId)}
          onClose={() => setIsVersionsOpen(false)}
        />
      ) : null}

      {publishFields ? (
        <DraftPublishModal
          fields={publishFields}
          onFieldsChange={setPublishFields}
          onConfirm={() => void confirmPublish()}
          onClose={() => setPublishFields(null)}
        />
      ) : null}
    </main>
  );
}
