import type { AuthorProfile } from "@/lib/papers/catalog";
import { getAuthorByName } from "@/lib/papers/catalog";
import type { RecommendedCollaborator, RecommendedPaper } from "@/lib/recommendation";

export const INITIAL_TOPIC_COUNT = 3;
export const TOPIC_BATCH_SIZE = 3;
export const MAX_TOPIC_RECOMMENDATIONS = 12;

export type RecommendedTopic = {
  paper: RecommendedPaper["paper"];
  rationale: string;
  collaborators: AuthorProfile[];
};

type BuildRecommendedTopicsInput = {
  author: AuthorProfile;
  recommendedPapers: ReadonlyArray<RecommendedPaper>;
  collaborators: ReadonlyArray<RecommendedCollaborator>;
  visibleTopicCount: number;
};

export function buildRecommendedTopics({
  author,
  recommendedPapers,
  collaborators,
  visibleTopicCount,
}: BuildRecommendedTopicsInput): RecommendedTopic[] {
  return recommendedPapers.slice(0, visibleTopicCount).map(({ paper, rationale }) => {
    const paperCollaborators = paper.authors
      .map((name) => getAuthorByName(name))
      .filter(
        (candidate): candidate is AuthorProfile =>
          candidate !== null && candidate.normalizedName !== author.normalizedName,
      )
      .slice(0, 3);
    const collaboratorIds = new Set(paperCollaborators.map((candidate) => candidate.id));
    const fallbackCollaborators = collaborators
      .map((candidate) => candidate.author)
      .filter((candidate) => !collaboratorIds.has(candidate.id))
      .slice(0, Math.max(0, 3 - paperCollaborators.length));

    return {
      paper,
      rationale,
      collaborators: [...paperCollaborators, ...fallbackCollaborators],
    };
  });
}
