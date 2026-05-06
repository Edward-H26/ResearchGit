import type { CommentType, IdeaCommentRecord, ReactionKind } from "@/lib/ideas/store";

export const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  general: "General",
  method_critique: "Method critique",
  related_work: "Related work",
  experiment_idea: "Experiment idea",
  concern: "Concern",
};

export function commentReactionCount(comment: IdeaCommentRecord, kind: ReactionKind): number {
  return comment.reactions[kind].length;
}
