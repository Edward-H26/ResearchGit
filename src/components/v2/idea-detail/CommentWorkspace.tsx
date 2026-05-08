"use client";

import { COMMENT_TYPE_LABELS, commentReactionCount } from "@/components/v2/idea-detail/comments";
import { addCommentToIdea, toggleCommentReaction } from "@/lib/ideas/client-store";
import {
  COMMENT_TYPES,
  type CommentType,
  type IdeaCommentRecord,
  type IdeaRecord,
  REACTION_KINDS,
} from "@/lib/ideas/store";
import { useMemo, useState } from "react";

type CommentWorkspaceProps = {
  idea: IdeaRecord;
  viewerName: string;
  onIdeaUpdated: (idea: IdeaRecord) => void;
  layout?: "split" | "stacked";
};

export function CommentWorkspace({
  idea,
  viewerName,
  onIdeaUpdated,
  layout = "split",
}: CommentWorkspaceProps) {
  const [commentType, setCommentType] = useState<CommentType>("general");
  const [commentBody, setCommentBody] = useState("");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const topLevelComments = useMemo(
    () => idea.comments.filter((comment) => comment.parentCommentId === null),
    [idea.comments],
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, IdeaCommentRecord[]>();
    for (const comment of idea.comments) {
      if (!comment.parentCommentId) continue;
      map.set(comment.parentCommentId, [...(map.get(comment.parentCommentId) ?? []), comment]);
    }
    return map;
  }, [idea.comments]);

  async function submitComment(parentCommentId: string | null) {
    const body = parentCommentId ? replyBody : commentBody;
    if (body.trim().length === 0) return;
    const updated = await addCommentToIdea({
      ideaId: idea.id,
      authorName: viewerName,
      type: parentCommentId ? "general" : commentType,
      body,
      parentCommentId,
    });
    if (!updated) return;
    onIdeaUpdated(updated);
    if (parentCommentId) {
      setReplyBody("");
      setReplyFor(null);
    } else {
      setCommentBody("");
    }
  }

  async function toggleReaction(commentId: string, kind: (typeof REACTION_KINDS)[number]) {
    const updated = await toggleCommentReaction(idea.id, commentId, kind, viewerName);
    if (updated) onIdeaUpdated(updated);
  }

  return (
    <section
      data-comment-workspace="true"
      className={layout === "stacked" ? "grid gap-5" : "grid gap-5 xl:grid-cols-[0.88fr_1.12fr]"}
    >
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
            rows={6}
            placeholder="Write a structured comment"
            className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950"
          />
          <button
            type="button"
            onClick={() => void submitComment(null)}
            disabled={commentBody.trim().length === 0}
            className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            Post comment
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(57,44,18,0.08)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Comment threads</h2>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
            {topLevelComments.length} thread(s)
          </span>
        </div>
        <div className="mt-5 grid max-h-[36rem] gap-4 overflow-y-auto pr-1">
          {topLevelComments.length === 0 ? (
            <p className="rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4 text-sm text-neutral-500">
              No comments yet.
            </p>
          ) : null}
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
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                {comment.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {REACTION_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => void toggleReaction(comment.id, kind)}
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
                    disabled={replyBody.trim().length === 0}
                    className="w-fit rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                  >
                    Post reply
                  </button>
                </div>
              ) : null}
              {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                <div key={reply.id} className="mt-4 rounded-[20px] bg-[#fcfbf8] p-4">
                  <p className="text-sm font-semibold">{reply.authorName}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                    {reply.body}
                  </p>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
