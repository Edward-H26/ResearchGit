import { TOPIC_IDEA_CARD_PREFIX } from "@/lib/ideas";
import {
  type IdeaRecord,
  type IdeaStoreState,
  getIdeasForAuthorFromState,
  isTopicCanvasIdea,
} from "@/lib/ideas/store";
import type { RecommendedTopic } from "@/lib/recommendation";

export type TopicActivity = {
  commentCount: number;
  isJoined: boolean;
  noteCount: number;
  statusLabels: string[];
};

export function ideasSignature(ideas: ReadonlyArray<IdeaRecord>): string {
  return ideas
    .map(
      (idea) =>
        `${idea.id}:${idea.status}:${idea.updatedAt}:${idea.notes.length}:${idea.comments.length}`,
    )
    .join("|");
}

export function dashboardIdeasFromState(
  storeState: IdeaStoreState,
  authorName: string,
): IdeaRecord[] {
  const seen = new Set<string>();
  return [
    ...getIdeasForAuthorFromState(storeState, authorName),
    ...storeState.ideas.filter((idea) => idea.status === "open"),
  ]
    .filter((idea) => {
      if (seen.has(idea.id)) return false;
      seen.add(idea.id);
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function topicActivityFromIdeas(
  ideas: ReadonlyArray<IdeaRecord>,
  recommendation: RecommendedTopic,
  joinedTopicIds: ReadonlyArray<string>,
): TopicActivity {
  const topicPaperIds = new Set(recommendation.topic.papers.map((paper) => paper.id));
  const topicCardId = `${TOPIC_IDEA_CARD_PREFIX}${recommendation.topic.id}`;
  const topicIdea = ideas.find((idea) => idea.cardId === topicCardId) ?? null;
  const relatedIdeas = ideas.filter(
    (idea) =>
      !isTopicCanvasIdea(idea) &&
      idea.groundingPaperIds.some((paperId) => topicPaperIds.has(paperId)),
  );
  const isJoined = joinedTopicIds.includes(recommendation.topic.id);
  const hasDraft = relatedIdeas.some((idea) => idea.status === "draft");
  const hasOpen = Boolean(topicIdea) || relatedIdeas.some((idea) => idea.status === "open");
  const hasPrivate = relatedIdeas.some((idea) => idea.status === "locked");
  const statusLabels = [
    hasDraft ? "Draft" : null,
    hasOpen ? "Open" : null,
    hasPrivate ? "Private" : null,
    isJoined ? "Joined" : null,
  ].filter((label): label is string => Boolean(label));

  return {
    commentCount: topicIdea?.comments.length ?? 0,
    isJoined,
    noteCount: topicIdea?.notes.length ?? 0,
    statusLabels,
  };
}
