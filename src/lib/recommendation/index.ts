import {
  type AuthorProfile,
  type CatalogPaper,
  getAllPapers,
  getAuthorByName,
  getAuthors,
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

export type RecommendedCollaborator = {
  author: AuthorProfile;
  score: number;
  rationale: string;
  track: "with-you" | "stretch-you";
};

function buildPaperProfile(paper: CatalogPaper): Set<string> {
  return tokenizeRecommendationText(`${paper.title} ${paper.abstract}`);
}

function buildAuthorProfile(author: AuthorProfile): Set<string> {
  return tokenizeRecommendationText(author.keywordProfile.join(" "));
}

export function recommendPapersForAuthor(authorName: string, limit = 5): RecommendedPaper[] {
  const author = getAuthorByName(authorName);
  if (!author) return [];

  const authoredIds = new Set(author.papers.map((paper) => paper.id));
  const authoredProfile = tokenizeRecommendationText(
    author.papers.map((paper) => `${paper.title} ${paper.abstract}`).join(" "),
  );

  return getAllPapers()
    .filter((paper) => !authoredIds.has(paper.id))
    .map((paper) => {
      const paperProfile = buildPaperProfile(paper);
      const score = jaccardScore(authoredProfile, paperProfile);
      const overlap = sharedRecommendationTokens(authoredProfile, paperProfile, 2);
      return {
        paper,
        score,
        rationale:
          overlap.length > 0
            ? `Shares themes around ${author.keywordProfile.slice(0, 2).join(" and ")}.`
            : `High abstract overlap with ${author.name}'s recent CHI work.`,
      };
    })
    .sort((a, b) => b.score - a.score || a.paper.title.localeCompare(b.paper.title))
    .slice(0, limit);
}

export function recommendCollaboratorsForAuthor(
  authorName: string,
  limitPerTrack = 3,
): RecommendedCollaborator[] {
  const author = getAuthorByName(authorName);
  if (!author) return [];

  const sourceProfile = buildAuthorProfile(author);
  const sourcePaperRooms = new Set(author.papers.map((paper) => paper.sessionRoom));

  const ranked = getAuthors()
    .filter((candidate) => candidate.normalizedName !== author.normalizedName)
    .map((candidate) => {
      const score = jaccardScore(sourceProfile, buildAuthorProfile(candidate));
      const sameRoomShare = candidate.papers.some((paper) =>
        sourcePaperRooms.has(paper.sessionRoom),
      );
      return {
        author: candidate,
        score,
        rationale: sameRoomShare
          ? `Complements ${author.name} while staying close to overlapping CHI sessions.`
          : `Brings adjacent perspectives without duplicating ${author.name}'s primary room.`,
        track: sameRoomShare ? ("with-you" as const) : ("stretch-you" as const),
      };
    })
    .sort((a, b) => b.score - a.score || a.author.name.localeCompare(b.author.name));

  const withYou = ranked
    .filter((candidate) => candidate.track === "with-you")
    .slice(0, limitPerTrack);
  const stretchYou = ranked
    .filter((candidate) => candidate.track === "stretch-you")
    .slice(0, limitPerTrack);

  return [...withYou, ...stretchYou];
}
