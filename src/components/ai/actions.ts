"use server";

import { auth } from "@/lib/auth";
import type { StickyIntent } from "@/lib/canvas/schema";
import { reviseIdea } from "@/lib/llm/client";
import { runRead, runWrite } from "@/lib/neo4j";
import { z } from "zod";

const StickySnapshotSchema = z.object({
  text: z.string(),
  intent: z.enum(["add", "delete", "merge"]),
  authorHandle: z.string(),
});

const RequestRevisionInput = z.object({
  ideaId: z.string().min(1).max(128),
  intent: z.string().min(1).max(2_000),
  notes: z.array(StickySnapshotSchema).max(500),
});

export type RevisionPreview = {
  ok: true;
  revisedMarkdown: string;
  changelog: string;
};
export type RevisionError = { ok: false; error: string };
export type RevisionResult = RevisionPreview | RevisionError;

export async function requestRevisionAction(
  raw: z.infer<typeof RequestRevisionInput>,
): Promise<RevisionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const parsed = RequestRevisionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const fetched = await runRead(
    `
    MATCH (i:Idea { id: $ideaId })-[:HAS_VERSION]->(v:IdeaVersion)
    WITH v ORDER BY v.ord DESC LIMIT 1
    RETURN v.proposalMarkdown AS markdown
    `,
    { ideaId: parsed.data.ideaId },
    z.object({ markdown: z.string() }),
  );
  const currentMarkdown = fetched[0]?.markdown ?? "";
  if (!currentMarkdown) return { ok: false, error: "idea_not_found" };

  const result = await reviseIdea({
    currentMarkdown,
    stickies: parsed.data.notes.map((n) => ({
      text: n.text,
      intent: n.intent as StickyIntent,
      authorHandle: n.authorHandle,
    })),
    userIntent: parsed.data.intent,
  });

  return {
    ok: true,
    revisedMarkdown: result.revisedMarkdown,
    changelog: result.changelog,
  };
}

const AcceptRevisionInput = z.object({
  ideaId: z.string().min(1).max(128),
  revisedMarkdown: z.string().min(1),
  changelog: z.string().min(1).max(500),
  revisionIntent: z.string().min(1).max(2_000),
});

const AcceptResultSchema = z.object({ versionId: z.string(), ord: z.number().int() });

export async function acceptRevisionAction(
  raw: z.infer<typeof AcceptRevisionInput>,
): Promise<{ ok: true; versionId: string; ord: number } | RevisionError> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const parsed = AcceptRevisionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const rows = await runWrite(
    `
    MATCH (i:Idea { id: $ideaId })-[:HAS_VERSION]->(existing:IdeaVersion)
    WITH i, existing ORDER BY existing.ord DESC LIMIT 1
    CREATE (next:IdeaVersion {
      id: randomUUID(),
      ord: existing.ord + 1,
      title: existing.title,
      researchQuestion: existing.researchQuestion,
      rationale: existing.rationale,
      proposalMarkdown: $revisedMarkdown,
      source: 'ai-revise',
      revisionIntent: $revisionIntent,
      changelog: $changelog,
      createdAt: datetime()
    })
    MERGE (i)-[:HAS_VERSION]->(next)
    WITH i, next, existing
    OPTIONAL MATCH (existing)-[:CITES]->(p:AnchorPaper)
    WITH i, next, collect(p) AS anchors
    FOREACH (paper IN anchors |
      MERGE (next)-[:CITES]->(paper)
    )
    WITH next
    MATCH (u:User { id: $userId })
    MERGE (u)-[:AUTHORED]->(next)
    RETURN next.id AS versionId, next.ord AS ord
    `,
    {
      ideaId: parsed.data.ideaId,
      revisedMarkdown: parsed.data.revisedMarkdown,
      changelog: parsed.data.changelog,
      revisionIntent: parsed.data.revisionIntent,
      userId: session.user.id,
    },
    AcceptResultSchema,
  );

  const first = rows[0];
  if (!first) return { ok: false, error: "accept_failed" };
  return { ok: true, ...first };
}
