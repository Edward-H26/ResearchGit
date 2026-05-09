import type { StickyNote } from "@/lib/canvas";

export const STORE_VERSION = 8;

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
  joinedTopicIdsByAuthor: Record<string, string[]>;
};

export type IdeaMutationResult = {
  state: IdeaStoreState;
  idea: IdeaRecord | null;
};
