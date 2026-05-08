import { StickyNoteSchema } from "@/lib/canvas";
import { type IdeaCard, parseTopicIdeaCardId } from "@/lib/ideas";
import {
  COMMENT_TYPES,
  type CommentType,
  type IdeaMutationResult,
  type IdeaStoreState,
  type IdeaVersionTrigger,
  REACTION_KINDS,
  type ReactionKind,
  addCommentToIdeaInState,
  clearJoinedTopicsForAuthorInState,
  completeOnboardingInState,
  createIdeaFromCardInState,
  createTopicIdeaFromCardInState,
  deleteCommentFromIdeaInState,
  deleteIdeaInState,
  publishIdeaInState,
  restoreDraftVersionInState,
  saveDraftVersionInState,
  saveIdeaNotesInState,
  saveTopicRecommendationCountInState,
  toggleCommentReactionInState,
  toggleIdeaUpvoteInState,
} from "@/lib/ideas/store";
import { getAuthorByName } from "@/lib/papers/catalog";
import { getCatalogTopicById } from "@/lib/recommendation";
import { z } from "zod";

export const IdeaStoreActionSchema = z.object({
  action: z.string(),
  payload: z.unknown().optional(),
});

const IdeaCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  hypothesis: z.string(),
  methodSketch: z.string(),
  novelty: z.array(z.string()),
  groundingPaperIds: z.array(z.string()),
});
const IdeaFieldsSchema = z.object({
  title: z.string(),
  hypothesis: z.string(),
  methodology: z.string(),
  novelty: z.array(z.string()),
  citations: z.array(z.string()),
});
const StickyNotesSchema = z.array(StickyNoteSchema);
const CommentTypeSchema = z.enum(COMMENT_TYPES);
const ReactionKindSchema = z.enum(REACTION_KINDS);
const IdeaVersionTriggerSchema = z.enum([
  "manual",
  "ai_quick_action",
  "ai_custom_prompt",
  "ai_iteration",
  "manual_restore",
]);

export type IdeaStoreAction = z.infer<typeof IdeaStoreActionSchema>;

function objectPayload(payload: unknown): Record<string, unknown> {
  return typeof payload === "object" && payload !== null
    ? (payload as Record<string, unknown>)
    : {};
}

function emptyMutation(state: IdeaStoreState): IdeaMutationResult {
  return { state, idea: null };
}

function matchedAuthorName(value: unknown): string | null {
  return getAuthorByName(String(value ?? ""))?.name ?? null;
}

function hasValidTopicScope(card: IdeaCard): boolean {
  const parsed = parseTopicIdeaCardId(card.id);
  if (!parsed) return false;
  const topic = getCatalogTopicById(parsed.topicId);
  if (!topic) return false;
  return !parsed.paperId || topic.papers.some((paper) => paper.id === parsed.paperId);
}

export function applyIdeaStoreAction(
  state: IdeaStoreState,
  action: IdeaStoreAction,
  authorizedAuthorName?: string | null,
): IdeaMutationResult {
  const payload = objectPayload(action.payload);

  const requestAuthorName = (value: unknown): string | null => {
    if (authorizedAuthorName !== undefined) return authorizedAuthorName;
    return matchedAuthorName(value);
  };

  switch (action.action) {
    case "createIdeaFromCard": {
      const card = IdeaCardSchema.safeParse(payload.card);
      const authorName = requestAuthorName(payload.authorName);
      if (!card.success || !authorName) return emptyMutation(state);
      return createIdeaFromCardInState(state, card.data, authorName);
    }
    case "createTopicIdeaFromCard": {
      const card = IdeaCardSchema.safeParse(payload.card);
      const actorName = requestAuthorName(payload.actorName);
      if (!card.success || !actorName || !hasValidTopicScope(card.data)) {
        return emptyMutation(state);
      }
      return createTopicIdeaFromCardInState(state, card.data, actorName);
    }
    case "deleteIdea": {
      const actorName = requestAuthorName(payload.actorName);
      if (!actorName) return emptyMutation(state);
      return deleteIdeaInState(state, String(payload.ideaId ?? ""), actorName);
    }
    case "saveIdeaNotes": {
      const actorName = requestAuthorName(payload.actorName);
      const notes = StickyNotesSchema.safeParse(payload.notes);
      if (!actorName || !notes.success) return emptyMutation(state);
      return saveIdeaNotesInState(state, String(payload.ideaId ?? ""), notes.data, actorName);
    }
    case "publishIdea": {
      const actorName = requestAuthorName(payload.actorName);
      const fields = IdeaFieldsSchema.safeParse(payload.fields);
      const notes = payload.notes === undefined ? null : StickyNotesSchema.safeParse(payload.notes);
      if (!actorName || !fields.success || (notes !== null && !notes.success)) {
        return emptyMutation(state);
      }
      return publishIdeaInState(
        state,
        String(payload.ideaId ?? ""),
        fields.data,
        actorName,
        notes?.data,
      );
    }
    case "saveDraftVersion": {
      const actorName = requestAuthorName(payload.actorName);
      const fields = IdeaFieldsSchema.safeParse(payload.fields);
      const notes = StickyNotesSchema.safeParse(payload.notes);
      const trigger = IdeaVersionTriggerSchema.safeParse(payload.trigger);
      if (!actorName || !fields.success || !notes.success || !trigger.success) {
        return emptyMutation(state);
      }
      return saveDraftVersionInState(
        state,
        String(payload.ideaId ?? ""),
        fields.data,
        notes.data,
        trigger.data as IdeaVersionTrigger,
        String(payload.summary ?? ""),
        actorName,
      );
    }
    case "restoreDraftVersion": {
      const actorName = requestAuthorName(payload.actorName);
      if (!actorName) return emptyMutation(state);
      return restoreDraftVersionInState(
        state,
        String(payload.ideaId ?? ""),
        String(payload.versionId ?? ""),
        actorName,
      );
    }
    case "addCommentToIdea": {
      const authorName = requestAuthorName(payload.authorName);
      const type = CommentTypeSchema.safeParse(payload.type);
      if (!authorName || !type.success) return emptyMutation(state);
      return addCommentToIdeaInState(state, {
        ideaId: String(payload.ideaId ?? ""),
        authorName,
        type: type.data as CommentType,
        body: String(payload.body ?? ""),
        parentCommentId: (payload.parentCommentId as string | null | undefined) ?? null,
      });
    }
    case "deleteCommentFromIdea": {
      const actorName = requestAuthorName(payload.actorName);
      if (!actorName) return emptyMutation(state);
      return deleteCommentFromIdeaInState(
        state,
        String(payload.ideaId ?? ""),
        String(payload.commentId ?? ""),
        actorName,
      );
    }
    case "toggleIdeaUpvote": {
      const authorName = requestAuthorName(payload.authorName);
      if (!authorName) return emptyMutation(state);
      return toggleIdeaUpvoteInState(state, String(payload.ideaId ?? ""), authorName);
    }
    case "toggleCommentReaction": {
      const authorName = requestAuthorName(payload.authorName);
      const kind = ReactionKindSchema.safeParse(payload.kind);
      if (!authorName || !kind.success) return emptyMutation(state);
      return toggleCommentReactionInState(
        state,
        String(payload.ideaId ?? ""),
        String(payload.commentId ?? ""),
        kind.data as ReactionKind,
        authorName,
      );
    }
    case "completeOnboarding": {
      const author = getAuthorByName(
        authorizedAuthorName ?? String(payload.normalizedAuthorName ?? ""),
      );
      if (!author) return emptyMutation(state);
      return {
        state: completeOnboardingInState(state, author.normalizedName),
        idea: null,
      };
    }
    case "saveTopicRecommendationCount": {
      const author = getAuthorByName(
        authorizedAuthorName ?? String(payload.normalizedAuthorName ?? ""),
      );
      if (!author) return emptyMutation(state);
      return saveTopicRecommendationCountInState(
        state,
        author.normalizedName,
        Number(payload.visibleTopicCount ?? 0),
      );
    }
    case "clearJoinedTopics": {
      const author = getAuthorByName(
        authorizedAuthorName ?? String(payload.normalizedAuthorName ?? ""),
      );
      if (!author) return emptyMutation(state);
      return clearJoinedTopicsForAuthorInState(state, author.normalizedName);
    }
    default:
      return emptyMutation(state);
  }
}
