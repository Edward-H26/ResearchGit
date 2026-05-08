import {
  type AuthorProfile,
  type CatalogPaper,
  getAllPapers,
  getAuthorByName,
} from "@/lib/papers/catalog";
import {
  jaccardScore,
  sharedRecommendationTokens,
  tokenizeRecommendationText,
} from "@/lib/recommendation/scoring";

export type RecommendedPaper = {
  paper: CatalogPaper;
  score: number;
  rationale: string;
};

export type CatalogTopic = {
  id: string;
  label: string;
  source: string;
  sessionRoom: string;
  papers: CatalogPaper[];
  keywordProfile: string[];
};

export type RecommendedTopic = {
  topic: CatalogTopic;
  score: number;
  rationale: string;
  recommendedPapers: CatalogPaper[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function paperProfileText(paper: CatalogPaper): string {
  return [paper.title, paper.abstract, paper.domain ?? "", paper.sessionRoom].join(" ");
}

function buildPaperProfile(paper: CatalogPaper): Set<string> {
  return tokenizeRecommendationText(paperProfileText(paper));
}

function buildAuthorProfile(author: AuthorProfile): Set<string> {
  return tokenizeRecommendationText(author.papers.map(paperProfileText).join(" "));
}

function normalizedDomain(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function sessionTopicLabelForPaper(paper: CatalogPaper): string {
  const domain = paper.domain?.trim();
  if (domain) return domain;
  if (paper.sessionRoom.trim() && paper.sessionRoom !== "Unassigned") {
    return paper.sessionRoom;
  }
  const keywords = [...buildPaperProfile(paper)].slice(0, 3);
  return keywords.length > 0 ? `Unassigned, ${keywords.join(" ")}` : "Unassigned CHI work";
}

function sessionTopicKeyForPaper(paper: CatalogPaper): string {
  return slugify(`${paper.sessionRoom}-${normalizedDomain(paper.domain) || "session"}`);
}

function topicSourceForPaper(paper: CatalogPaper): string {
  if (paper.sessionRoom.trim() && paper.sessionRoom !== "Unassigned") {
    return `Session: ${paper.sessionRoom}`;
  }
  return "Derived from unassigned CHI 2026 records";
}

function buildTopicKeywordProfile(papers: ReadonlyArray<CatalogPaper>): string[] {
  const counts = new Map<string, number>();
  for (const paper of papers) {
    for (const token of buildPaperProfile(paper)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([token]) => token);
}

function compareTopics(left: CatalogTopic, right: CatalogTopic): number {
  return (
    left.sessionRoom.localeCompare(right.sessionRoom) ||
    left.label.localeCompare(right.label) ||
    right.papers.length - left.papers.length
  );
}

function scoreTopicForAuthor(author: AuthorProfile, topic: CatalogTopic): number {
  const ownPaperIds = new Set(author.papers.map((paper) => paper.id));
  const ownPaperCount = topic.papers.filter((paper) => ownPaperIds.has(paper.id)).length;
  const authorProfile = buildAuthorProfile(author);
  const topicProfile = tokenizeRecommendationText(topic.keywordProfile.join(" "));
  const overlap = jaccardScore(authorProfile, topicProfile);
  const topicSizeBoost = Math.min(0.25, topic.papers.length / 100);
  const ownTopicBoost = ownPaperCount > 0 ? 1 + ownPaperCount * 0.2 : 0;
  return ownTopicBoost + overlap + topicSizeBoost;
}

function topicRationale(author: AuthorProfile, topic: CatalogTopic, score: number): string {
  const ownPaperTitles = topic.papers
    .filter((paper) => paper.authors.includes(author.name))
    .map((paper) => paper.title);
  if (ownPaperTitles.length > 0) {
    return `Anchored by ${author.name}'s CHI 2026 paper "${ownPaperTitles[0]}" in ${topic.sessionRoom}, with ${topic.papers.length - ownPaperTitles.length} same-session paper(s) available for comparison.`;
  }
  const shared = sharedRecommendationTokens(
    buildAuthorProfile(author),
    tokenizeRecommendationText(topic.keywordProfile.join(" ")),
    3,
  );
  if (shared.length > 0) {
    return `Shares topic signals around ${shared.join(", ")} with ${author.name}'s CHI 2026 work.`;
  }
  return `Ranks this CHI 2026 session topic through catalog proximity and topic size score ${score.toFixed(2)}.`;
}

function recommendedPapersForTopic(author: AuthorProfile, topic: CatalogTopic): CatalogPaper[] {
  const ownPaperIds = new Set(author.papers.map((paper) => paper.id));
  const authorProfile = buildAuthorProfile(author);
  return [...topic.papers]
    .sort((left, right) => {
      const leftOwn = ownPaperIds.has(left.id) ? 1 : 0;
      const rightOwn = ownPaperIds.has(right.id) ? 1 : 0;
      if (leftOwn !== rightOwn) return rightOwn - leftOwn;
      const leftScore = jaccardScore(authorProfile, buildPaperProfile(left));
      const rightScore = jaccardScore(authorProfile, buildPaperProfile(right));
      return rightScore - leftScore || left.title.localeCompare(right.title);
    })
    .slice(0, 6);
}

export function getCatalogTopics(): CatalogTopic[] {
  const groups = new Map<
    string,
    { label: string; source: string; sessionRoom: string; papers: CatalogPaper[] }
  >();

  for (const paper of getAllPapers()) {
    const label = sessionTopicLabelForPaper(paper);
    const key = sessionTopicKeyForPaper(paper);
    const existing = groups.get(key);
    if (existing) {
      existing.papers.push(paper);
      continue;
    }
    groups.set(key, {
      label,
      source: topicSourceForPaper(paper),
      sessionRoom: paper.sessionRoom,
      papers: [paper],
    });
  }

  return [...groups.entries()]
    .map(([id, group]) => ({
      id,
      label: group.label,
      source: group.source,
      sessionRoom: group.sessionRoom,
      papers: group.papers,
      keywordProfile: buildTopicKeywordProfile(group.papers),
    }))
    .sort(compareTopics);
}

export function getCatalogTopicById(topicId: string): CatalogTopic | null {
  return getCatalogTopics().find((topic) => topic.id === topicId) ?? null;
}

export function recommendTopicByIdForAuthor(
  authorName: string,
  topicId: string,
): RecommendedTopic | null {
  const author = getAuthorByName(authorName);
  const topic = getCatalogTopicById(topicId);
  if (!author || !topic) return null;
  const score = scoreTopicForAuthor(author, topic);
  return {
    topic,
    score,
    rationale: topicRationale(author, topic, score),
    recommendedPapers: recommendedPapersForTopic(author, topic),
  };
}

function mergeRecommendedTopics(topics: ReadonlyArray<RecommendedTopic>): RecommendedTopic[] {
  const seen = new Set<string>();
  return topics.filter((recommendation) => {
    if (seen.has(recommendation.topic.id)) return false;
    seen.add(recommendation.topic.id);
    return true;
  });
}

function ownSessionTopicsForAuthor(author: AuthorProfile): CatalogTopic[] {
  const topicById = new Map(getCatalogTopics().map((topic) => [topic.id, topic]));
  return author.papers
    .map((paper) => topicById.get(sessionTopicKeyForPaper(paper)) ?? null)
    .filter((topic): topic is CatalogTopic => topic !== null);
}

export function recommendTopicsForAuthor(authorName: string, limit = 6): RecommendedTopic[] {
  const author = getAuthorByName(authorName);
  if (!author) return [];

  return mergeRecommendedTopics(
    ownSessionTopicsForAuthor(author).map((topic) => {
      const score = scoreTopicForAuthor(author, topic);
      return {
        topic,
        score,
        rationale: topicRationale(author, topic, score),
        recommendedPapers: recommendedPapersForTopic(author, topic),
      };
    }),
  )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.topic.sessionRoom.localeCompare(right.topic.sessionRoom) ||
        left.topic.label.localeCompare(right.topic.label),
    )
    .slice(0, limit);
}

export function recommendAdditionalTopicsForAuthor(
  authorName: string,
  keywords: string,
  limit = 6,
): RecommendedTopic[] {
  const author = getAuthorByName(authorName);
  if (!author) return [];

  const queryProfile = tokenizeRecommendationText(keywords);
  if (queryProfile.size === 0) return [];

  const ownTopicIds = new Set(ownSessionTopicsForAuthor(author).map((topic) => topic.id));
  const authorProfile = buildAuthorProfile(author);

  return getCatalogTopics()
    .filter((topic) => !ownTopicIds.has(topic.id) && topic.source.startsWith("Session:"))
    .map((topic) => {
      const topicProfile = tokenizeRecommendationText(
        `${topic.label} ${topic.source} ${topic.keywordProfile.join(" ")}`,
      );
      const queryScore = jaccardScore(queryProfile, topicProfile) * 2;
      const authorScore = jaccardScore(authorProfile, topicProfile);
      const score = queryScore + authorScore + Math.min(0.2, topic.papers.length / 120);
      return {
        topic,
        score,
        rationale:
          queryScore > 0
            ? `Generated from keyword overlap with "${keywords.trim()}" in ${topic.sessionRoom}.`
            : topicRationale(author, topic, score),
        recommendedPapers: recommendedPapersForTopic(author, topic),
      };
    })
    .filter((recommendation) => recommendation.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.topic.sessionRoom.localeCompare(right.topic.sessionRoom) ||
        left.topic.label.localeCompare(right.topic.label),
    )
    .slice(0, limit);
}

export function recommendPapersForAuthor(authorName: string, limit = 5): RecommendedPaper[] {
  const author = getAuthorByName(authorName);
  if (!author) return [];

  const authoredIds = new Set(author.papers.map((paper) => paper.id));
  const authoredProfile = buildAuthorProfile(author);
  const selected = new Map<string, RecommendedPaper>();

  for (const topicRecommendation of recommendTopicsForAuthor(author.name, limit * 2)) {
    for (const paper of topicRecommendation.topic.papers) {
      if (authoredIds.has(paper.id) || selected.has(paper.id)) continue;
      const paperScore = jaccardScore(authoredProfile, buildPaperProfile(paper));
      const overlap = sharedRecommendationTokens(authoredProfile, buildPaperProfile(paper), 2);
      selected.set(paper.id, {
        paper,
        score: topicRecommendation.score + paperScore,
        rationale:
          overlap.length > 0
            ? `Same broader topic as ${topicRecommendation.topic.label}, with shared signals around ${overlap.join(" and ")}.`
            : `Comes from the same CHI 2026 topic group, ${topicRecommendation.topic.label}.`,
      });
    }
  }

  return [...selected.values()]
    .sort((a, b) => b.score - a.score || a.paper.title.localeCompare(b.paper.title))
    .slice(0, limit);
}
