import "server-only";
import { runRead, runWrite } from "@/lib/neo4j";
import { requireFirstResult } from "@/server/result";
import { z } from "zod";

const MergeUserResultSchema = z.object({
  id: z.string(),
  isNew: z.boolean(),
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
      u.email = $email,
      u.handle = $name,
      u.avatarUrl = $avatarUrl,
      u.onboardingCompleted = false,
      u.createdAt = datetime(),
      u.__isNew = true
    ON MATCH SET
      u.email = $email,
      u.handle = $name,
      u.avatarUrl = $avatarUrl,
      u.__isNew = false
    WITH u, u.__isNew AS isNew
    REMOVE u.__isNew
    RETURN u.id AS id, coalesce(isNew, false) AS isNew
  `;
  const results = await runWrite(cypher, input, MergeUserResultSchema);
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
