import "server-only";

import { env } from "@/env";
import { type AuthorProfile, getAuthorByName } from "@/lib/papers/catalog";
import type { Session } from "next-auth";

export function isE2EAuthorBypassEnabled(): boolean {
  return env.RESEARCHGIT_E2E_AUTHOR_BYPASS === "1";
}

export function getSessionAuthor(session: Session | null): AuthorProfile | null {
  const matchedAuthorName = session?.user?.matchedAuthorName ?? null;
  return matchedAuthorName ? getAuthorByName(matchedAuthorName) : null;
}

export function resolvePageAuthor(
  session: Session | null,
  requestedAuthorName: string | null | undefined,
): AuthorProfile | null {
  const sessionAuthor = getSessionAuthor(session);
  if (session?.user?.id) return sessionAuthor;
  if (isE2EAuthorBypassEnabled() && requestedAuthorName) {
    return getAuthorByName(requestedAuthorName);
  }
  return sessionAuthor;
}

export function resolveActionAuthorName(
  session: Session | null,
  requestedAuthorName: string | null | undefined,
): string | null {
  const sessionAuthor = getSessionAuthor(session);
  if (sessionAuthor) return sessionAuthor.name;
  if (isE2EAuthorBypassEnabled() && requestedAuthorName) {
    return getAuthorByName(requestedAuthorName)?.name ?? null;
  }
  return null;
}
