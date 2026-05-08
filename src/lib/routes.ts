import type { IdeaStatus } from "@/lib/ideas/store";

function authorQuery(authorName: string): string {
  return `author=${encodeURIComponent(authorName)}`;
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

export function dashboardHref(authorName: string): string {
  return `/dashboard?${authorQuery(authorName)}`;
}

export function onboardingDashboardHref(authorName: string, onboardingKey = "1"): string {
  return `/dashboard?${authorQuery(authorName)}&onboard=${encodeURIComponent(onboardingKey)}`;
}

export function marketplaceHref(authorName: string): string {
  return `/marketplace?${authorQuery(authorName)}`;
}

export function topicHref(topicId: string, authorName: string): string {
  return `/topics/${pathSegment(topicId)}?${authorQuery(authorName)}`;
}

export function topicPaperHref(topicId: string, paperId: string, authorName: string): string {
  return `/topics/${pathSegment(topicId)}/papers/${pathSegment(paperId)}?${authorQuery(authorName)}`;
}

export function ideaGenerationHref(
  authorName: string,
  mode = "all",
  paperIds: ReadonlyArray<string> = [],
): string {
  const paperQuery = paperIds.map((paperId) => `paperId=${encodeURIComponent(paperId)}`).join("&");
  const query = [`${authorQuery(authorName)}`, `mode=${encodeURIComponent(mode)}`, paperQuery]
    .filter(Boolean)
    .join("&");
  return `/ideas/new?${query}`;
}

export function ideaHref(id: string, status: IdeaStatus | string, authorName: string): string {
  const ideaId = pathSegment(id);
  if (status === "draft") return `/ideas/${ideaId}/draft?${authorQuery(authorName)}`;
  return `/ideas/${ideaId}?${authorQuery(authorName)}`;
}

export function ideaDetailHref(
  id: string,
  status: IdeaStatus | string,
  authorName: string,
): string {
  return ideaHref(id, status, authorName);
}
