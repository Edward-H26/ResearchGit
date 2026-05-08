"use client";

import { StickyNotesBoard } from "@/components/canvas";
import { useDebouncedIdeaNotes } from "@/components/v2/hooks/useDebouncedIdeaNotes";
import { CommentWorkspace } from "@/components/v2/idea-detail/CommentWorkspace";
import { TopicPaperArea } from "@/components/v2/topic-canvas/TopicPaperArea";
import { TopicReportPanel } from "@/components/v2/topic-canvas/TopicReportPanel";
import { type TopicReport, buildTopicReport } from "@/components/v2/topic-canvas/report";
import type { StickyNote } from "@/lib/canvas";
import { buildTopicIdeaCard, buildTopicPaperIdeaCard } from "@/lib/ideas";
import {
  createTopicIdeaFromCard,
  getIdeaById,
  saveIdeaNotes,
  subscribeToIdeaStore,
} from "@/lib/ideas/client-store";
import type { IdeaRecord } from "@/lib/ideas/store";
import { getAuthorByName } from "@/lib/papers/catalog";
import { getCatalogTopicById } from "@/lib/recommendation";
import { dashboardHref, marketplaceHref } from "@/lib/routes";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TopicCanvasClientProps = {
  topicId: string;
  viewerName: string | null;
  paperId?: string | null;
};

const NOTE_SAVE_DEBOUNCE_MS = 500;
const LOCAL_EDIT_GRACE_MS = 900;

export function TopicCanvasClient({ topicId, viewerName, paperId = null }: TopicCanvasClientProps) {
  const topic = useMemo(() => getCatalogTopicById(topicId), [topicId]);
  const activePaper = useMemo(
    () => topic?.papers.find((paper) => paper.id === paperId) ?? null,
    [paperId, topic],
  );
  const hasInvalidPaper = Boolean(paperId && topic && !activePaper);
  const topicCard = useMemo(() => {
    if (!topic) return null;
    return activePaper ? buildTopicPaperIdeaCard(topic, activePaper) : buildTopicIdeaCard(topic);
  }, [activePaper, topic]);
  const stickyEnhancementContext = useMemo(
    () => ({
      topicLabel: topic?.label,
      activePaperTitle: activePaper?.title,
      relatedPaperTitles:
        topic?.papers
          .filter((paper) => paper.id !== activePaper?.id)
          .slice(0, 5)
          .map((paper) => paper.title) ?? [],
      sourceSummary: activePaper?.abstract,
    }),
    [activePaper, topic],
  );
  const viewerAuthor = useMemo(
    () => (viewerName ? getAuthorByName(viewerName) : null),
    [viewerName],
  );
  const [ready, setReady] = useState(false);
  const [idea, setIdea] = useState<IdeaRecord | null>(null);
  const [report, setReport] = useState<TopicReport | null>(null);
  const topicIdeaIdRef = useRef<string | null>(null);
  const activeIdea = idea && topicCard && idea.cardId === topicCard.id ? idea : null;
  const persistTopicNotes = useCallback(
    (notes: ReadonlyArray<StickyNote>) => {
      if (!activeIdea || !viewerAuthor) return Promise.resolve(null);
      return saveIdeaNotes(activeIdea.id, notes, viewerAuthor.name);
    },
    [activeIdea, viewerAuthor],
  );
  const applyUpdated = useCallback((updated: IdeaRecord) => {
    setIdea(updated);
  }, []);
  const {
    hasPendingLocalSave,
    trackRemoteNotes,
    saveNotes: queueNotesSave,
  } = useDebouncedIdeaNotes({
    delayMs: NOTE_SAVE_DEBOUNCE_MS,
    localEditGraceMs: LOCAL_EDIT_GRACE_MS,
    persist: persistTopicNotes,
    applyUpdated,
  });

  useEffect(() => {
    let canceled = false;
    topicIdeaIdRef.current = null;
    setReport(null);
    setIdea(null);
    setReady(false);

    async function ensureTopicIdea() {
      if (!topic || !viewerAuthor) {
        if (!canceled) setReady(true);
        return;
      }
      if (!topicCard) {
        if (!canceled) setReady(true);
        return;
      }
      const created = await createTopicIdeaFromCard(topicCard, viewerAuthor.name);
      if (canceled) return;
      if (!created) {
        setReady(true);
        return;
      }
      topicIdeaIdRef.current = created.id;
      trackRemoteNotes(created.notes);
      setIdea(created);
      setReady(true);
    }

    void ensureTopicIdea();
    const unsubscribe = subscribeToIdeaStore(async () => {
      if (hasPendingLocalSave()) return;
      const topicIdeaId = topicIdeaIdRef.current;
      if (!topicIdeaId) return;
      const current = await getIdeaById(topicIdeaId);
      if (!canceled && current) {
        trackRemoteNotes(current.notes);
        setIdea(current);
      }
    });

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [hasPendingLocalSave, topic, topicCard, trackRemoteNotes, viewerAuthor]);

  function saveCanvasNotes(notes: ReadonlyArray<StickyNote>) {
    if (!activeIdea || !viewerAuthor) return;
    setIdea((current) =>
      current?.id === activeIdea.id
        ? { ...current, notes: [...notes], updatedAt: new Date().toISOString() }
        : current,
    );
    queueNotesSave(notes);
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <p className="text-sm font-semibold text-neutral-500">Loading topic canvas</p>
      </main>
    );
  }

  if (!topic) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25]">
          <h1 className="text-2xl font-semibold">Topic not found</h1>
          <p className="mt-3 text-sm leading-relaxed">
            This CHI 2026 topic was not found in papers_by_room.json.
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

  if (hasInvalidPaper) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25]">
          <h1 className="text-2xl font-semibold">Paper not found</h1>
          <p className="mt-3 text-sm leading-relaxed">
            This paper is not part of the selected CHI 2026 topic session.
          </p>
          <Link
            href={viewerName ? dashboardHref(viewerName) : "/"}
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#8c3f25]"
          >
            Return to dashboard
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
            Topic canvases are available only after a matched CHI 2026 author identity.
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

  if (!activeIdea) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <p className="text-sm font-semibold text-neutral-500">Loading topic canvas</p>
      </main>
    );
  }

  const nonEmptyNoteCount = activeIdea.notes.filter((note) => note.text.trim()).length;
  const canGenerateReport = nonEmptyNoteCount >= 2;
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4efe6_0%,#f8f7f2_45%,#ffffff_100%)] px-5 py-8 text-neutral-950 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              {activePaper ? "Paper canvas" : "Broader topic"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {activePaper?.title ?? topic.label}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{activeIdea.hypothesis}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-600">
              <span className="rounded-full bg-neutral-100 px-3 py-1">{topic.source}</span>
              {activePaper ? (
                <span className="rounded-full bg-neutral-100 px-3 py-1">{topic.label}</span>
              ) : null}
              <span className="rounded-full bg-neutral-100 px-3 py-1">
                {activePaper ? "1 paper canvas" : `${topic.papers.length} paper(s)`}
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1">
                {activeIdea.notes.length} sticky note(s)
              </span>
            </div>
          </div>
          <div
            data-topic-header-actions="true"
            className="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-self-end"
          >
            <Link
              href={dashboardHref(viewerAuthor.name)}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 sm:flex-none"
            >
              Dashboard
            </Link>
            <Link
              href={marketplaceHref(viewerAuthor.name)}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 sm:flex-none"
            >
              Marketplace
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_24px_80px_rgba(57,44,18,0.08)]">
          <div className="border-b border-neutral-200 px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Shared canvas
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Sticky note area
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Post thoughts, build on others, and use AI assist to refine selected sticky notes.
            </p>
          </div>
          <div className="h-[560px] sm:h-[680px]">
            <StickyNotesBoard
              currentUser={{ id: viewerAuthor.id, handle: viewerAuthor.name }}
              initialNotes={activeIdea.notes}
              boardTitle={activePaper ? "Paper canvas" : "Topic canvas"}
              boardSubtitle={activePaper?.title ?? topic.label}
              enhancementContext={stickyEnhancementContext}
              sidebarActions={
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Analysis
                  </p>
                  <button
                    data-topic-report-action="true"
                    type="button"
                    onClick={() => setReport(buildTopicReport(topic, activeIdea))}
                    disabled={!canGenerateReport}
                    className="flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                  >
                    Generate analysis report
                  </button>
                  <p className="text-xs leading-relaxed text-neutral-500">
                    Available after 2 sticky notes have content.
                  </p>
                </>
              }
              onChange={saveCanvasNotes}
            />
          </div>
        </section>

        <TopicPaperArea
          topic={topic}
          viewerName={viewerAuthor.name}
          activePaperId={activePaper?.id ?? null}
        />

        {report ? <TopicReportPanel report={report} /> : null}

        <CommentWorkspace
          idea={activeIdea}
          viewerName={viewerAuthor.name}
          onIdeaUpdated={applyUpdated}
        />
      </div>
    </main>
  );
}
