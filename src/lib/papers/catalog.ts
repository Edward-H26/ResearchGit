import rawPapersByRoom from "../../../papers_by_room.json";

type RawPaper = {
  title: string;
  authors?: string[];
  abstract?: string;
  date?: string;
  url?: string;
  domain?: string;
  award?: string;
};

type RawCatalog = Record<string, RawPaper[]>;

export type CatalogPaper = {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  date: string;
  url: string;
  sessionRoom: string;
  domain: string | null;
  award: string | null;
};

export type AuthorProfile = {
  id: string;
  name: string;
  normalizedName: string;
  affiliation: string;
  papers: CatalogPaper[];
  keywordProfile: string[];
};

export type AuthorMatch = {
  author: AuthorProfile;
  kind: "exact" | "token" | "fuzzy";
  distance: number;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "using",
  "with",
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const deleteCost = (previous[rightIndex] ?? Number.POSITIVE_INFINITY) + 1;
      const insertCost = (current[rightIndex - 1] ?? Number.POSITIVE_INFINITY) + 1;
      const substituteCost =
        (previous[rightIndex - 1] ?? Number.POSITIVE_INFINITY) + substitutionCost;
      current[rightIndex] = Math.min(deleteCost, insertCost, substituteCost);
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] ?? Number.POSITIVE_INFINITY;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

const papers = Object.entries(rawPapersByRoom as RawCatalog).flatMap(([sessionRoom, items]) =>
  items.map((paper, index) => ({
    id: `${slugify(sessionRoom)}-${index + 1}`,
    title: paper.title.trim(),
    authors: paper.authors ?? [],
    abstract: paper.abstract?.trim() ?? "",
    date: paper.date?.trim() ?? "",
    url: paper.url?.trim() ?? "",
    sessionRoom,
    domain: paper.domain?.trim() || null,
    award: paper.award?.trim() || null,
  })),
);

const authorMap = new Map<string, AuthorProfile>();

for (const paper of papers) {
  for (const authorName of paper.authors) {
    const normalizedName = normalizeName(authorName);
    if (!normalizedName) continue;

    const existing = authorMap.get(normalizedName);
    if (existing) {
      existing.papers.push(paper);
      continue;
    }

    authorMap.set(normalizedName, {
      id: slugify(authorName),
      name: authorName,
      normalizedName,
      affiliation: paper.sessionRoom,
      papers: [paper],
      keywordProfile: [],
    });
  }
}

for (const profile of authorMap.values()) {
  const counts = new Map<string, number>();
  for (const paper of profile.papers) {
    for (const token of tokenize(`${paper.title} ${paper.abstract}`)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  profile.keywordProfile = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([token]) => token);
}

export function getAllPapers(): CatalogPaper[] {
  return papers;
}

export function getPaperById(paperId: string): CatalogPaper | null {
  return papers.find((paper) => paper.id === paperId) ?? null;
}

export function getAuthors(): AuthorProfile[] {
  return [...authorMap.values()].sort((a, b) => b.papers.length - a.papers.length);
}

export function getAuthorByName(name: string): AuthorProfile | null {
  return authorMap.get(normalizeName(name)) ?? null;
}

export function findCHIAuthorMatches(rawName: string): AuthorMatch[] {
  const normalizedName = normalizeName(rawName);
  if (!normalizedName) return [];

  const authors = getAuthors();
  const exact = authors
    .filter((author) => author.normalizedName === normalizedName)
    .map((author) => ({ author, kind: "exact" as const, distance: 0 }));
  if (exact.length > 0) return exact;

  const queryTokens = normalizedName.split(" ").filter(Boolean);
  const tokenMatches =
    queryTokens.length === 1 && normalizedName.length >= 4
      ? authors
          .filter((author) => author.normalizedName.split(" ").includes(normalizedName))
          .map((author) => ({ author, kind: "token" as const, distance: 0 }))
      : [];

  const fuzzyMatches = authors
    .map((author) => ({
      author,
      kind: "fuzzy" as const,
      distance: levenshteinDistance(normalizedName, author.normalizedName),
    }))
    .filter((match) => match.distance <= 2);

  const seen = new Set<string>();
  return [...tokenMatches, ...fuzzyMatches]
    .filter((match) => {
      if (seen.has(match.author.normalizedName)) return false;
      seen.add(match.author.normalizedName);
      return true;
    })
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        b.author.papers.length - a.author.papers.length ||
        a.author.name.localeCompare(b.author.name),
    )
    .slice(0, 5);
}

export function getPapersForAuthor(name: string): CatalogPaper[] {
  return getAuthorByName(name)?.papers ?? [];
}
