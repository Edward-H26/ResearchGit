import type { IdeaStatus } from "@/lib/ideas/store";

function authorQuery(authorName: string): string {
  return `author=${encodeURIComponent(authorName)}`;
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
  if (status === "draft") return `/ideas/${id}/draft?${authorQuery(authorName)}`;
  return `/ideas/${id}?${authorQuery(authorName)}`;
}

export function ideaDetailHref(
  id: string,
  status: IdeaStatus | string,
  authorName: string,
): string {
  return ideaHref(id, status, authorName);
}
