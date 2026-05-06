import type { StickyNote } from "@/lib/canvas";
import {
  type IdeaCard,
  applyThemesToNotes,
  buildDraftNotes,
  generateIdeaCards,
  synthesizeIdeaFromNotes,
} from "@/lib/ideas";
import { getAuthorByName } from "@/lib/papers/catalog";

export const STORE_VERSION = 8;
const CATALOG_MARKETPLACE_AUTHOR_NAMES = ["Yun Huang", "Yiren Liu", "Hyanghee Park"] as const;

export const COMMENT_TYPES = [
  "general",
  "method_critique",
  "related_work",
  "experiment_idea",
  "concern",
] as const;

export const REACTION_KINDS = ["👍", "👎", "🎯", "💡", "⚠️", "❓"] as const;

export type IdeaStatus = "draft" | "open" | "locked";
export type CommentType = (typeof COMMENT_TYPES)[number];
export type ReactionKind = (typeof REACTION_KINDS)[number];
export type ReactionMap = Record<ReactionKind, string[]>;
export type IdeaVersionTrigger =
  | "manual"
  | "ai_quick_action"
  | "ai_custom_prompt"
  | "ai_iteration"
  | "manual_restore";

export type IdeaFields = {
  title: string;
  hypothesis: string;
  methodology: string;
  novelty: string[];
  citations: string[];
};

export type IdeaCommentRecord = {
  id: string;
  ideaId: string;
  authorName: string;
  type: CommentType;
  body: string;
  parentCommentId: string | null;
  reactions: ReactionMap;
  createdAt: string;
  editedAt: string | null;
};

export type IdeaVersion = {
  id: string;
  ord: number;
  trigger: IdeaVersionTrigger;
  summary: string;
  fields: IdeaFields;
  notes: StickyNote[];
  createdAt: string;
};

export type IdeaRecord = IdeaFields & {
  id: string;
  cardId: string;
  ownerName: string;
  status: IdeaStatus;
  groundingPaperIds: string[];
  notes: StickyNote[];
  comments: IdeaCommentRecord[];
  versions: IdeaVersion[];
  upvotedBy: string[];
  createdAt: string;
  updatedAt: string;
};

export type IdeaStoreState = {
  version: number;
  ideas: IdeaRecord[];
  onboardingCompleteByAuthor: Record<string, boolean>;
  topicRecommendationCountByAuthor: Record<string, number>;
};

export type IdeaMutationResult = {
  state: IdeaStoreState;
  idea: IdeaRecord | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function nowIso(): string {
  return new Date().toISOString();
}

function ideaCardKey(idea: Pick<IdeaRecord, "ownerName" | "cardId">): string {
  return `${idea.ownerName}::${idea.cardId}`;
}

function compareIdeasForDisplay(candidate: IdeaRecord, current: IdeaRecord): number {
  const updatedComparison = candidate.updatedAt.localeCompare(current.updatedAt);
  if (updatedComparison !== 0) return updatedComparison;
  return candidate.id.localeCompare(current.id);
}

function preferredIdeaForCard(ideas: ReadonlyArray<IdeaRecord>): IdeaRecord | null {
  return ideas.reduce<IdeaRecord | null>((preferred, idea) => {
    if (!preferred) return idea;
    return compareIdeasForDisplay(idea, preferred) > 0 ? idea : preferred;
  }, null);
}

export function dedupeIdeasByOwnerAndCard(ideas: ReadonlyArray<IdeaRecord>): IdeaRecord[] {
  const preferredByCard = new Map<string, IdeaRecord>();
  for (const idea of ideas) {
    const key = ideaCardKey(idea);
    const current = preferredByCard.get(key);
    if (!current || compareIdeasForDisplay(idea, current) > 0) {
      preferredByCard.set(key, idea);
    }
  }

  return ideas.filter((idea) => preferredByCard.get(ideaCardKey(idea))?.id === idea.id);
}

function emptyReactions(): ReactionMap {
  return {
    "👍": [],
    "👎": [],
    "🎯": [],
    "💡": [],
    "⚠️": [],
    "❓": [],
  };
}

function cloneReactions(reactions: ReactionMap): ReactionMap {
  return {
    "👍": [...reactions["👍"]],
    "👎": [...reactions["👎"]],
    "🎯": [...reactions["🎯"]],
    "💡": [...reactions["💡"]],
    "⚠️": [...reactions["⚠️"]],
    "❓": [...reactions["❓"]],
  };
}

function isPrivateIdea(idea: IdeaRecord): boolean {
  return idea.status === "locked";
}

function shouldRefreshPaperGrounding(
  idea: Pick<IdeaRecord, "groundingPaperIds" | "methodology" | "title">,
): boolean {
  return (
    idea.groundingPaperIds.length > 0 &&
    (idea.title.startsWith("From ") ||
      !idea.methodology.includes("Source paper:") ||
      !idea.methodology.includes("Abstract:"))
  );
}

export function ideaRecordToCard(idea: IdeaRecord): IdeaCard {
  return {
    id: idea.cardId,
    title: idea.title,
    hypothesis: idea.hypothesis,
    methodSketch: idea.methodology,
    novelty: idea.novelty,
    groundingPaperIds: idea.groundingPaperIds,
  };
}

function buildIdeaRecord(
  card: IdeaCard,
  authorName: string,
  authorUserId: string,
  id: string,
  createdAt: string,
  status: IdeaStatus = "draft",
): IdeaRecord {
  const draftNotes = buildDraftNotes(card, authorName, authorUserId);
  const notes = status === "draft" ? draftNotes : applyThemesToNotes(draftNotes);
  const synthesis = synthesizeIdeaFromNotes(card, notes);
  const fields: IdeaFields = {
    title: synthesis.title,
    hypothesis: synthesis.hypothesis,
    methodology: synthesis.methodology || card.methodSketch,
    novelty: synthesis.novelty,
    citations: synthesis.citations,
  };
  const versions: IdeaVersion[] =
    status === "draft"
      ? []
      : [
          {
            id: `${id}-version-0`,
            ord: 0,
            trigger: "manual",
            summary: "Published baseline",
            fields,
            notes,
            createdAt,
          },
        ];

  return {
    id,
    cardId: card.id,
    ownerName: authorName,
    status,
    groundingPaperIds: card.groundingPaperIds,
    notes,
    comments: [],
    versions,
    upvotedBy: [],
    createdAt,
    updatedAt: createdAt,
    ...fields,
  };
}

export function normalizeIdeaStoreState(state: IdeaStoreState): IdeaStoreState {
  return {
    ...state,
    topicRecommendationCountByAuthor: state.topicRecommendationCountByAuthor ?? {},
    ideas: state.ideas.map((idea) => {
      const {
        lockedAt: _lockedAt,
        lockReport: _lockReport,
        status,
        ...rest
      } = idea as IdeaRecord & {
        lockedAt?: unknown;
        lockReport?: unknown;
      };
      const comments = rest.comments.map((comment) => {
        const {
          markedHelpful: _markedHelpful,
          absorbedInVersionIds: _absorbedInVersionIds,
          ...commentRest
        } = comment as IdeaCommentRecord & {
          markedHelpful?: unknown;
          absorbedInVersionIds?: unknown;
        };
        return commentRest;
      });
      const versions = rest.versions.map((version) => {
        const {
          absorbedCommentIds: _absorbedCommentIds,
          trigger,
          summary,
          notes,
          ...versionRest
        } = version as IdeaVersion & {
          absorbedCommentIds?: unknown;
          trigger?: unknown;
          summary?: unknown;
          notes?: unknown;
        };
        return {
          ...versionRest,
          trigger: isIdeaVersionTrigger(trigger) ? trigger : "manual",
          summary: typeof summary === "string" ? summary : `Version ${versionRest.ord}`,
          notes: Array.isArray(notes) ? (notes as StickyNote[]) : rest.notes,
        };
      });
      const sourceCard =
        status !== "draft" && shouldRefreshPaperGrounding(rest)
          ? generateIdeaCards(rest.groundingPaperIds, rest.ownerName)[0]
          : null;
      const notes = rest.notes.some((note) => note.themeIndex !== null && note.width < 300)
        ? applyThemesToNotes(rest.notes)
        : rest.notes;
      const refreshedFields = sourceCard ? synthesizeIdeaFromNotes(sourceCard, notes) : null;
      const refreshedVersions =
        refreshedFields && versions.length > 0
          ? versions.map((version, index) =>
              index === versions.length - 1 ? { ...version, fields: refreshedFields } : version,
            )
          : versions;
      return {
        ...rest,
        comments,
        notes,
        versions: refreshedVersions,
        ...(refreshedFields ?? {}),
        status: status === "draft" || status === "locked" ? status : "open",
      };
    }),
  };
}

function buildCatalogMarketplaceIdea(authorName: string): IdeaRecord | null {
  const author = getAuthorByName(authorName);
  const paper = author?.papers[0];
  if (!author || !paper) return null;

  const card = generateIdeaCards([paper.id], author.name)[0];
  if (!card) return null;

  return buildIdeaRecord(
    card,
    author.name,
    author.id,
    `idea-${author.id}-${card.id}-open`,
    nowIso(),
    "open",
  );
}

export function initialIdeaStoreState(): IdeaStoreState {
  return {
    version: STORE_VERSION,
    ideas: CATALOG_MARKETPLACE_AUTHOR_NAMES.flatMap((authorName) => {
      const idea = buildCatalogMarketplaceIdea(authorName);
      return idea ? [idea] : [];
    }),
    onboardingCompleteByAuthor: {},
    topicRecommendationCountByAuthor: {},
  };
}

export function getAllIdeasFromState(state: IdeaStoreState): IdeaRecord[] {
  return state.ideas;
}

export function getIdeasForAuthorFromState(
  state: IdeaStoreState,
  authorName: string,
): IdeaRecord[] {
  return dedupeIdeasByOwnerAndCard(state.ideas.filter((idea) => idea.ownerName === authorName));
}

export function getIdeaByIdFromState(state: IdeaStoreState, id: string): IdeaRecord | null {
  return state.ideas.find((idea) => idea.id === id) ?? null;
}

export function upsertIdeaInState(state: IdeaStoreState, idea: IdeaRecord): IdeaStoreState {
  const existingIndex = state.ideas.findIndex((candidate) => candidate.id === idea.id);
  const ideas =
    existingIndex >= 0
      ? state.ideas.map((candidate) => (candidate.id === idea.id ? idea : candidate))
      : [idea, ...state.ideas];
  return { ...state, ideas };
}

export function updateIdeaInState(
  state: IdeaStoreState,
  id: string,
  updater: (idea: IdeaRecord) => IdeaRecord,
): IdeaMutationResult {
  const existing = state.ideas.find((idea) => idea.id === id);
  if (!existing) return { state, idea: null };

  const updated = updater(existing);
  const ideas = state.ideas.map((idea) => (idea.id === id ? updated : idea));
  return { state: { ...state, ideas }, idea: updated };
}

function updateOwnerIdeaInState(
  state: IdeaStoreState,
  id: string,
  actorName: string | undefined,
  updater: (idea: IdeaRecord) => IdeaRecord,
): IdeaMutationResult {
  const existing = state.ideas.find((idea) => idea.id === id);
  if (!existing || (actorName !== undefined && existing.ownerName !== actorName)) {
    return { state, idea: null };
  }
  return updateIdeaInState(state, id, updater);
}

export function deleteIdeaInState(
  state: IdeaStoreState,
  id: string,
  actorName?: string,
): IdeaMutationResult {
  const existing = state.ideas.find((idea) => idea.id === id);
  if (!existing || (actorName !== undefined && existing.ownerName !== actorName)) {
    return { state, idea: null };
  }

  return {
    state: {
      ...state,
      ideas: state.ideas.filter((idea) => idea.id !== id),
    },
    idea: existing,
  };
}

export function createIdeaFromCardInState(
  state: IdeaStoreState,
  card: IdeaCard,
  authorName: string,
): IdeaMutationResult {
  const existingDraft = state.ideas.find(
    (idea) => idea.cardId === card.id && idea.ownerName === authorName && idea.status === "draft",
  );
  if (existingDraft) return { state, idea: existingDraft };

  const existingIdea = preferredIdeaForCard(
    state.ideas.filter((idea) => idea.cardId === card.id && idea.ownerName === authorName),
  );
  if (existingIdea) return { state, idea: existingIdea };

  const id = `idea-${slugify(authorName)}-${card.id}-${Date.now().toString(36)}`;
  const authorUserId = getAuthorByName(authorName)?.id ?? slugify(authorName);
  const idea = buildIdeaRecord(card, authorName, authorUserId, id, nowIso());
  return { state: { ...state, ideas: [idea, ...state.ideas] }, idea };
}

export function saveIdeaNotesInState(
  state: IdeaStoreState,
  id: string,
  notes: ReadonlyArray<StickyNote>,
  actorName?: string,
): IdeaMutationResult {
  return updateOwnerIdeaInState(state, id, actorName, (idea) => {
    return {
      ...idea,
      notes: [...notes],
      updatedAt: nowIso(),
    };
  });
}

export function publishIdeaInState(
  state: IdeaStoreState,
  id: string,
  fields: IdeaFields,
  actorName?: string,
  notes?: ReadonlyArray<StickyNote>,
): IdeaMutationResult {
  return updateOwnerIdeaInState(state, id, actorName, (idea) => {
    if (idea.status !== "draft") return idea;
    const createdAt = nowIso();
    const publishedNotes = notes ? [...notes] : idea.notes;
    const version: IdeaVersion = {
      id: `${idea.id}-version-${idea.versions.length}`,
      ord: idea.versions.length,
      trigger: "manual",
      summary: "Published to marketplace",
      fields,
      notes: publishedNotes,
      createdAt,
    };
    return {
      ...idea,
      ...fields,
      notes: publishedNotes,
      status: "open",
      updatedAt: createdAt,
      versions: [...idea.versions, version],
    };
  });
}

function isIdeaVersionTrigger(value: unknown): value is IdeaVersionTrigger {
  return (
    value === "manual" ||
    value === "ai_quick_action" ||
    value === "ai_custom_prompt" ||
    value === "ai_iteration" ||
    value === "manual_restore"
  );
}

export function saveDraftVersionInState(
  state: IdeaStoreState,
  id: string,
  fields: IdeaFields,
  notes: ReadonlyArray<StickyNote>,
  trigger: IdeaVersionTrigger,
  summary: string,
  actorName?: string,
): IdeaMutationResult {
  return updateOwnerIdeaInState(state, id, actorName, (idea) => {
    if (idea.status !== "draft") return idea;
    const createdAt = nowIso();
    const snapshotNotes = [...notes];
    const version: IdeaVersion = {
      id: `${idea.id}-version-${idea.versions.length}`,
      ord: idea.versions.length,
      trigger,
      summary: summary.trim() || `Version ${idea.versions.length}`,
      fields,
      notes: snapshotNotes,
      createdAt,
    };
    return {
      ...idea,
      ...fields,
      notes: snapshotNotes,
      versions: [...idea.versions, version],
      updatedAt: createdAt,
    };
  });
}

export function restoreDraftVersionInState(
  state: IdeaStoreState,
  id: string,
  versionId: string,
  actorName?: string,
): IdeaMutationResult {
  return updateOwnerIdeaInState(state, id, actorName, (idea) => {
    if (idea.status !== "draft") return idea;
    const version = idea.versions.find((candidate) => candidate.id === versionId);
    if (!version) return idea;
    const createdAt = nowIso();
    const versionFields = version.fields;
    const versionNotes = [...version.notes];
    const restoreVersion: IdeaVersion = {
      id: `${idea.id}-version-${idea.versions.length}`,
      ord: idea.versions.length,
      trigger: "manual_restore",
      summary: `Restored ${version.summary}`,
      fields: versionFields,
      notes: versionNotes,
      createdAt,
    };
    return {
      ...idea,
      ...versionFields,
      notes: versionNotes,
      versions: [...idea.versions, restoreVersion],
      updatedAt: createdAt,
    };
  });
}

export function addCommentToIdeaInState(
  state: IdeaStoreState,
  input: {
    ideaId: string;
    authorName: string;
    type: CommentType;
    body: string;
    parentCommentId?: string | null;
  },
): IdeaMutationResult {
  return updateIdeaInState(state, input.ideaId, (idea) => {
    if (isPrivateIdea(idea) && input.authorName !== idea.ownerName) return idea;

    const parent = input.parentCommentId
      ? idea.comments.find((comment) => comment.id === input.parentCommentId)
      : null;
    const parentCommentId = parent && parent.parentCommentId === null ? parent.id : null;
    const createdAt = nowIso();
    const comment: IdeaCommentRecord = {
      id: `${idea.id}-comment-${createdAt.replace(/[^0-9]/g, "")}-${idea.comments.length + 1}`,
      ideaId: idea.id,
      authorName: input.authorName,
      type: input.type,
      body: input.body.trim().slice(0, 2000),
      parentCommentId,
      reactions: emptyReactions(),
      createdAt,
      editedAt: null,
    };

    return {
      ...idea,
      comments: [...idea.comments, comment],
      updatedAt: createdAt,
    };
  });
}

export function toggleIdeaUpvoteInState(
  state: IdeaStoreState,
  id: string,
  authorName: string,
): IdeaMutationResult {
  return updateIdeaInState(state, id, (idea) => {
    if (idea.status === "draft" || (isPrivateIdea(idea) && authorName !== idea.ownerName)) {
      return idea;
    }
    const hasVote = idea.upvotedBy.includes(authorName);
    return {
      ...idea,
      upvotedBy: hasVote
        ? idea.upvotedBy.filter((name) => name !== authorName)
        : [...idea.upvotedBy, authorName],
      updatedAt: nowIso(),
    };
  });
}

export function toggleCommentReactionInState(
  state: IdeaStoreState,
  ideaId: string,
  commentId: string,
  kind: ReactionKind,
  authorName: string,
): IdeaMutationResult {
  return updateIdeaInState(state, ideaId, (idea) => {
    if (isPrivateIdea(idea) && authorName !== idea.ownerName) return idea;

    return {
      ...idea,
      comments: idea.comments.map((comment) => {
        if (comment.id !== commentId) return comment;
        const reactions = cloneReactions(comment.reactions);
        const existing = reactions[kind];
        reactions[kind] = existing.includes(authorName)
          ? existing.filter((name) => name !== authorName)
          : [...existing, authorName];
        return { ...comment, reactions };
      }),
      updatedAt: nowIso(),
    };
  });
}

export function completeOnboardingInState(
  state: IdeaStoreState,
  normalizedAuthorName: string,
): IdeaStoreState {
  return {
    ...state,
    onboardingCompleteByAuthor: {
      ...state.onboardingCompleteByAuthor,
      [normalizedAuthorName]: true,
    },
  };
}

export function saveTopicRecommendationCountInState(
  state: IdeaStoreState,
  normalizedAuthorName: string,
  visibleTopicCount: number,
): IdeaMutationResult {
  const authorKey = normalizedAuthorName.trim();
  if (!authorKey) return { state, idea: null };

  return {
    state: {
      ...state,
      topicRecommendationCountByAuthor: {
        ...state.topicRecommendationCountByAuthor,
        [authorKey]: Math.max(0, Math.floor(visibleTopicCount)),
      },
    },
    idea: null,
  };
}
