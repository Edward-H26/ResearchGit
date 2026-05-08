import type { RecommendedTopic } from "@/lib/recommendation";

export const INITIAL_TOPIC_COUNT = 3;
export const TOPIC_BATCH_SIZE = 3;
export const MAX_TOPIC_RECOMMENDATIONS = 12;

export function visibleRecommendedTopics(
  topics: ReadonlyArray<RecommendedTopic>,
  visibleTopicCount: number,
): RecommendedTopic[] {
  return topics.slice(0, visibleTopicCount);
}
