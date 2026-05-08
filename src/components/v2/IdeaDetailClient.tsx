"use client";

import { StickyNotesBoard } from "@/components/canvas";
import { useDebouncedIdeaNotes } from "@/components/v2/hooks/useDebouncedIdeaNotes";
import { CommentWorkspace } from "@/components/v2/idea-detail/CommentWorkspace";
import type { StickyNote } from "@/lib/canvas";
import { THEME_DISPLAY_DEFINITIONS, UNGROUPED_THEME_INDEX } from "@/lib/ideas";
import {
  getIdeaById,
  saveIdeaNotes,
  subscribeToIdeaStore,
  toggleIdeaUpvote,
} from "@/lib/ideas/client-store";
import { type IdeaRecord, isTopicCanvasIdea } from "@/lib/ideas/store";
import { getAuthorByName, getPaperById } from "@/lib/papers/catalog";
import { marketplaceHref } from "@/lib/routes";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type IdeaDetailClientProps = {
  ideaId: string;
  viewerName: string | null;
};

export function IdeaDetailClient({ ideaId, viewerName }: IdeaDetailClientProps) {
  const [ready, setReady] = useState(false);
  const [idea, setIdea] = useState<IdeaRecord | null>(null);
  const currentIdeaId = idea?.id ?? null;
  const viewer = viewerName ?? "";
  const persistNotes = useCallback(
    (notes: ReadonlyArray<StickyNote>) => {
      if (!currentIdeaId) return Promise.resolve(null);
      return saveIdeaNotes(currentIdeaId, notes, viewer);
    },
    [currentIdeaId, viewer],
  );
  const applySavedNotes = useCallback((updated: IdeaRecord) => {
    setIdea(updated);
  }, []);
  const {
    hasPendingLocalSave,
    trackRemoteNotes,
    saveNotes: queueNotesSave,
  } = useDebouncedIdeaNotes({
    delayMs: 500,
    localEditGraceMs: 900,
    persist: persistNotes,
    applyUpdated: applySavedNotes,
  });

  useEffect(() => {
    let canceled = false;

    async function loadIdea() {
      const current = await getIdeaById(ideaId);
      if (!canceled) {
        setIdea(current);
        setReady(true);
      }
    }

    void loadIdea();
    const unsubscribe = subscribeToIdeaStore(() => {
      if (!hasPendingLocalSave()) void loadIdea();
    });
    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [hasPendingLocalSave, ideaId]);

  const viewerAuthor = viewerName ? getAuthorByName(viewerName) : null;
  const isOwner = idea?.ownerName === viewerAuthor?.name;
  const isTopicCanvas = idea ? isTopicCanvasIdea(idea) : false;
  const isPrivateIdea = idea?.status === "locked";
  const canvasThemeLabels = useMemo(
    () =>
      idea
        ? THEME_DISPLAY_DEFINITIONS.filter((theme) =>
            idea.notes.some((note) => note.themeIndex === theme.index),
          ).map((theme) => ({
            ...theme,
            isUngrouped: theme.index === UNGROUPED_THEME_INDEX,
          }))
        : [],
    [idea],
  );
  const canvasPaperContext = useMemo(() => {
    if (!idea) return [];
    return idea.groundingPaperIds
      .map((paperId) => getPaperById(paperId))
      .filter((paper) => paper !== null);
  }, [idea]);
  const stickyEnhancementContext = useMemo(
    () => ({
      topicLabel: isTopicCanvas ? idea?.title : undefined,
      relatedPaperTitles: canvasPaperContext.map((paper) => paper.title),
      sourceSummary: idea ? [idea.hypothesis, idea.methodology].join("\n") : undefined,
    }),
    [canvasPaperContext, idea, isTopicCanvas],
  );

  function applyUpdated(updated: IdeaRecord | null) {
    if (updated) {
      trackRemoteNotes(updated.notes);
      setIdea(updated);
    }
  }

  const saveCanvasNotes = useCallback(
    async (notes: ReadonlyArray<StickyNote>) => {
      if (!currentIdeaId) return;
      setIdea((current) =>
        current?.id === currentIdeaId
          ? { ...current, notes: [...notes], updatedAt: new Date().toISOString() }
          : current,
      );
      queueNotesSave(notes);
    },
    [currentIdeaId, queueNotesSave],
  );

  useEffect(() => {
    if (idea) trackRemoteNotes(idea.notes);
  }, [idea, trackRemoteNotes]);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <p className="text-sm font-semibold text-neutral-500">Loading idea</p>
      </main>
    );
  }

  if (!idea) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25]">
          <h1 className="text-2xl font-semibold">Idea not found</h1>
          <p className="mt-3 text-sm leading-relaxed">
            This idea was not found in the current workspace.
          </p>
          <Link
            href="/marketplace"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#8c3f25]"
          >
            Return to marketplace
          </Link>
        </section>
      </main>
    );
  }

  if (!viewerName || !viewerAuthor) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25]">
          <h1 className="text-2xl font-semibold">Author match required</h1>
          <p className="mt-3 text-sm leading-relaxed">
            Viewing and contributing to marketplace ideas requires a matched CHI 2026 author
            identity.
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

  if (isPrivateIdea && !isOwner) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25]">
          <h1 className="text-2xl font-semibold">Idea access restricted</h1>
          <p className="mt-3 text-sm leading-relaxed">
            This idea is private to its owning author and is not available in the shared
            marketplace.
          </p>
          <Link
            href={marketplaceHref(viewer)}
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#8c3f25]"
          >
            Return to marketplace
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4efe6_0%,#f8f7f2_45%,#ffffff_100%)] px-5 py-8 text-neutral-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Public idea
            </p>
            <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
              {idea.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{idea.hypothesis}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-600">
              <span className="rounded-full bg-neutral-100 px-3 py-1">{idea.ownerName}</span>
              <span className="rounded-full bg-neutral-100 px-3 py-1">
                {idea.upvotedBy.length} upvote(s)
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1">
                {idea.versions.length} version(s)
              </span>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            <Link
              href={marketplaceHref(viewer)}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 sm:flex-none"
            >
              Marketplace
            </Link>
            <button
              type="button"
              onClick={() => void toggleIdeaUpvote(idea.id, viewer).then(applyUpdated)}
              className="flex-1 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:flex-none"
            >
              {idea.upvotedBy.includes(viewer) ? "Upvoted" : "Upvote"}
            </button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_24px_80px_rgba(57,44,18,0.08)]">
          <div className="border-b border-neutral-200 px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Marketplace canvas
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Shared collaboration board
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {isOwner
                ? "Review and refine the canvas while this idea remains open."
                : isTopicCanvas
                  ? "Add sticky notes to the public topic canvas with other interested researchers."
                  : "Review the published canvas. Contributor feedback belongs in comments below."}
            </p>
          </div>
          <div className="h-[520px] sm:h-[620px]">
            <StickyNotesBoard
              currentUser={{ id: viewerAuthor.id, handle: viewerAuthor.name }}
              initialNotes={idea.notes}
              themeLabels={canvasThemeLabels}
              boardTitle="Shared canvas"
              boardSubtitle="Marketplace collaboration"
              enhancementContext={stickyEnhancementContext}
              onChange={saveCanvasNotes}
              readOnly={!isOwner && !isTopicCanvas}
            />
          </div>
        </section>

        <div className="mt-8">
          <CommentWorkspace idea={idea} viewerName={viewer} onIdeaUpdated={applyUpdated} />
        </div>
      </div>
    </main>
  );
}
