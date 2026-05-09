import { type RecommendedTopic, recommendTopicByIdForAuthor } from "@/lib/recommendation";

export const INITIAL_TOPIC_COUNT = 3;
export const TOPIC_BATCH_SIZE = 3;
export const MAX_TOPIC_RECOMMENDATIONS = 12;

export function visibleRecommendedTopics(
  topics: ReadonlyArray<RecommendedTopic>,
  visibleTopicCount: number,
): RecommendedTopic[] {
  return topics.slice(0, visibleTopicCount);
}

export function mergeTopicRecommendations(
  primaryTopics: ReadonlyArray<RecommendedTopic>,
  generatedTopics: ReadonlyArray<RecommendedTopic>,
): RecommendedTopic[] {
  const seen = new Set<string>();
  return [...primaryTopics, ...generatedTopics].filter((recommendation) => {
    if (seen.has(recommendation.topic.id)) return false;
    seen.add(recommendation.topic.id);
    return true;
  });
}

export function topicRecommendationsFromIds(
  authorName: string,
  topicIds: ReadonlyArray<string>,
): RecommendedTopic[] {
  return topicIds
    .map((topicId) => recommendTopicByIdForAuthor(authorName, topicId))
    .filter((recommendation): recommendation is RecommendedTopic => recommendation !== null);
}
