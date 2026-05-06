"use client";

import { StickyNotesBoard } from "@/components/canvas";
import { COMMENT_TYPE_LABELS, commentReactionCount } from "@/components/v2/idea-detail/comments";
import type { StickyNote } from "@/lib/canvas";
import { THEME_DISPLAY_DEFINITIONS, UNGROUPED_THEME_INDEX } from "@/lib/ideas";
import {
  addCommentToIdea,
  getIdeaById,
  saveIdeaNotes,
  subscribeToIdeaStore,
  toggleCommentReaction,
  toggleIdeaUpvote,
} from "@/lib/ideas/client-store";
import {
  COMMENT_TYPES,
  type CommentType,
  type IdeaCommentRecord,
  type IdeaRecord,
  REACTION_KINDS,
} from "@/lib/ideas/store";
import { getAuthorByName } from "@/lib/papers/catalog";
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
  const [commentType, setCommentType] = useState<CommentType>("general");
  const [commentBody, setCommentBody] = useState("");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

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
    const unsubscribe = subscribeToIdeaStore(loadIdea);
    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [ideaId]);

  const viewer = viewerName ?? "";
  const viewerAuthor = viewerName ? getAuthorByName(viewerName) : null;
  const isOwner = idea?.ownerName === viewerAuthor?.name;
  const isPrivateIdea = idea?.status === "locked";
  const currentIdeaId = idea?.id ?? null;
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
  const topLevelComments = useMemo(
    () => idea?.comments.filter((comment) => comment.parentCommentId === null) ?? [],
    [idea],
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, IdeaCommentRecord[]>();
    for (const comment of idea?.comments ?? []) {
      if (!comment.parentCommentId) continue;
      map.set(comment.parentCommentId, [...(map.get(comment.parentCommentId) ?? []), comment]);
    }
    return map;
  }, [idea]);

  function applyUpdated(updated: IdeaRecord | null) {
    if (updated) setIdea(updated);
  }

  const saveCanvasNotes = useCallback(
    async (notes: ReadonlyArray<StickyNote>) => {
      if (!currentIdeaId) return;
      setIdea((current) =>
        current?.id === currentIdeaId
          ? { ...current, notes: [...notes], updatedAt: new Date().toISOString() }
          : current,
      );
      const updated = await saveIdeaNotes(currentIdeaId, notes, viewer);
      if (updated) setIdea(updated);
    },
    [currentIdeaId, viewer],
  );

  async function submitComment(parentCommentId: string | null) {
    const body = parentCommentId ? replyBody : commentBody;
    if (!idea || body.trim().length === 0) return;
    const updated = await addCommentToIdea({
      ideaId: idea.id,
      authorName: viewer,
      type: parentCommentId ? "general" : commentType,
      body,
      parentCommentId,
    });
    applyUpdated(updated);
    if (parentCommentId) {
      setReplyBody("");
      setReplyFor(null);
    } else {
      setCommentBody("");
    }
  }

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
              onChange={saveCanvasNotes}
              readOnly={!isOwner}
            />
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(57,44,18,0.08)] sm:p-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Published synthesis
            </h2>
            <div className="mt-5 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Methodology
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                  {idea.methodology}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Novelty
                </p>
                <ul className="mt-3 space-y-2">
                  {idea.novelty.map((point) => (
                    <li
                      key={point}
                      className="rounded-2xl bg-[#faf5ef] px-4 py-3 text-sm text-neutral-700"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Grounding citations
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {idea.citations.map((citation) => (
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
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(57,44,18,0.08)] sm:p-6">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Comment composer</h2>
              <div className="mt-4 grid gap-3">
                <select
                  value={commentType}
                  onChange={(event) => setCommentType(event.target.value as CommentType)}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950"
                >
                  {COMMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {COMMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="Write a structured comment"
                  className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950"
                />
                <button
                  type="button"
                  onClick={() => void submitComment(null)}
                  className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Post comment
                </button>
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-6 rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(57,44,18,0.08)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Comment threads</h2>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              Depth max 1
            </span>
          </div>
          <div className="mt-5 grid gap-4">
            {topLevelComments.map((comment) => (
              <article key={comment.id} className="rounded-[24px] border border-neutral-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{comment.authorName}</p>
                    <span className="mt-1 inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">
                      {COMMENT_TYPE_LABELS[comment.type]}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">{comment.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {REACTION_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() =>
                        void toggleCommentReaction(idea.id, comment.id, kind, viewer).then(
                          applyUpdated,
                        )
                      }
                      className="rounded-full border border-neutral-300 px-3 py-1 text-sm transition hover:border-neutral-950"
                    >
                      {kind} {commentReactionCount(comment, kind)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReplyFor(replyFor === comment.id ? null : comment.id)}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-sm font-semibold transition hover:border-neutral-950"
                  >
                    Reply
                  </button>
                </div>
                {replyFor === comment.id ? (
                  <div className="mt-4 grid gap-3 rounded-[20px] bg-[#fcfbf8] p-4">
                    <textarea
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      placeholder="Reply to this thread"
                      className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950"
                    />
                    <button
                      type="button"
                      onClick={() => void submitComment(comment.id)}
                      className="w-fit rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Post reply
                    </button>
                  </div>
                ) : null}
                {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                  <div key={reply.id} className="mt-4 rounded-[20px] bg-[#fcfbf8] p-4">
                    <p className="text-sm font-semibold">{reply.authorName}</p>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">{reply.body}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
