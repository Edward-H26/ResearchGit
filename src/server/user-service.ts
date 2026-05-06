import "server-only";
import { runRead, runWrite } from "@/lib/neo4j";
import { requireFirstResult } from "@/server/result";
import { z } from "zod";

// Hash a googleId to one of the 6 user-color tokens.
const COLOR_TOKENS = ["u-rose", "u-amber", "u-citron", "u-mint", "u-sky", "u-iris"] as const;
function colorTokenForGoogleId(googleId: string): string {
  let hash = 0;
  for (const ch of googleId) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  const idx = Math.abs(hash) % COLOR_TOKENS.length;
  return COLOR_TOKENS[idx] as string;
}

const MergeUserResultSchema = z.object({
  id: z.string(),
  isNew: z.boolean(),
  matchedAuthorName: z.string().nullable(),
});

export type MergeUserInput = {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
};

export type MergeUserResult = z.infer<typeof MergeUserResultSchema>;

export async function mergeUserNode(input: MergeUserInput): Promise<MergeUserResult> {
  const cypher = `
    MERGE (u:User { googleId: $googleId })
    ON CREATE SET
      u.id = randomUUID(),
      u.googleEmail = $email,
      u.name = $name,
      u.affiliation = '',
      u.avatarUrl = $avatarUrl,
      u.colorToken = $colorToken,
      u.matchedAuthorName = null,
      u.onboardingCompleted = false,
      u.createdAt = datetime(),
      u.__isNew = true
    ON MATCH SET
      u.googleEmail = $email,
      u.avatarUrl = $avatarUrl,
      u.__isNew = false
    WITH u, u.__isNew AS isNew
    REMOVE u.__isNew
    RETURN
      u.id AS id,
      coalesce(isNew, false) AS isNew,
      u.matchedAuthorName AS matchedAuthorName
  `;
  const results = await runWrite(
    cypher,
    { ...input, colorToken: colorTokenForGoogleId(input.googleId) },
    MergeUserResultSchema,
  );
  return requireFirstResult(results, "MERGE (:User) returned no rows");
}

const OnboardingStatusSchema = z.object({
  completed: z.boolean(),
});

export async function getOnboardingCompleted(userId: string): Promise<boolean> {
  const cypher = `
    MATCH (u:User { id: $userId })
    RETURN coalesce(u.onboardingCompleted, false) AS completed
  `;
  const rows = await runRead(cypher, { userId }, OnboardingStatusSchema);
  return rows[0]?.completed ?? false;
}

const MarkCompleteSchema = z.object({
  id: z.string(),
});

export async function markOnboardingCompleted(userId: string): Promise<void> {
  const cypher = `
    MATCH (u:User { id: $userId })
    SET u.onboardingCompleted = true
    RETURN u.id AS id
  `;
  const rows = await runWrite(cypher, { userId }, MarkCompleteSchema);
  requireFirstResult(rows, `User ${userId} was not found while marking onboarding complete`);
}

const UserSummarySchema = z.object({
  id: z.string(),
  googleEmail: z.string(),
  name: z.string(),
  affiliation: z.string(),
  colorToken: z.string(),
  matchedAuthorName: z.string().nullable(),
});

export type UserSummary = z.infer<typeof UserSummarySchema>;

export async function getUserSummary(userId: string): Promise<UserSummary | null> {
  const cypher = `
    MATCH (u:User { id: $userId })
    RETURN
      u.id AS id,
      coalesce(u.googleEmail, '') AS googleEmail,
      coalesce(u.name, '') AS name,
      coalesce(u.affiliation, '') AS affiliation,
      coalesce(u.colorToken, 'u-amber') AS colorToken,
      u.matchedAuthorName AS matchedAuthorName
  `;
  const rows = await runRead(cypher, { userId }, UserSummarySchema);
  return rows[0] ?? null;
}

const SetMatchedAuthorSchema = z.object({
  matchedAuthorName: z.string(),
});

/**
 * Persist the CHI Author identity the user picked at /login/disambiguate.
 * Called after the user confirms a match against the in-memory author catalog.
 */
export async function setMatchedAuthorName(
  userId: string,
  authorName: string,
  affiliation: string,
): Promise<{ matchedAuthorName: string }> {
  const cypher = `
    MATCH (u:User { id: $userId })
    SET u.matchedAuthorName = $authorName,
        u.name = $authorName,
        u.affiliation = $affiliation
    RETURN u.matchedAuthorName AS matchedAuthorName
  `;
  const rows = await runWrite(cypher, { userId, authorName, affiliation }, SetMatchedAuthorSchema);
  return requireFirstResult(rows, `Could not set matched author for user ${userId}.`);
}
