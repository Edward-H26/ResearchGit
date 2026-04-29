import "server-only";
import { env } from "@/env";
import {
  DEFAULT_CLUSTERS_PER_DECK,
  DEFAULT_PAPERS_PER_CLUSTER_PROMPT,
  loadCluster,
  loadTheme,
  sampleClusters,
  samplePapers,
} from "@/lib/catalog";
import {
  type ActiveDeck,
  ActiveDeckSchema,
  type RegenerateResult,
  RegenerateResultSchema,
} from "@/lib/deck/contracts";
import { generateIdeaForCluster } from "@/lib/llm/client";
import { PROMPT_VERSION } from "@/lib/llm/prompts";
import { runRead, runWrite } from "@/lib/neo4j";
import { requireFirstResult } from "@/server/result";
import { z } from "zod";

const ActiveDeckIdSchema = z.object({
  deckId: z.string(),
});

export type RegenerateProgressEvent =
  | { phase: "sampling"; totalClusters: number }
  | { phase: "idea-start"; index: number; total: number; clusterId: number; themeLabel: string }
  | { phase: "idea-done"; index: number; total: number; clusterId: number; title: string }
  | { phase: "writing" }
  | { phase: "done"; deckId: string; ideaCount: number }
  | { phase: "error"; message: string };

export type RegenerateProgressCallback = (event: RegenerateProgressEvent) => void;

export async function regenerateActiveDeck(input: {
  triggeredByUserId: string;
  onProgress?: RegenerateProgressCallback;
}): Promise<RegenerateResult> {
  const onProgress = input.onProgress ?? (() => {});
  const sampleSeed = `deck-${Date.now()}-${input.triggeredByUserId}`;
  const activeDeckBeforeGeneration =
    (
      await runRead(
        `
        MATCH (d:Deck { status: 'active' })
        RETURN d.id AS deckId
        ORDER BY d.generatedAt DESC
        LIMIT 1
        `,
        {},
        ActiveDeckIdSchema,
      )
    )[0] ?? null;
  const clusterIds = sampleClusters({ seed: sampleSeed, n: DEFAULT_CLUSTERS_PER_DECK });
  onProgress({ phase: "sampling", totalClusters: clusterIds.length });

  const total = clusterIds.length;
  const settled = await Promise.allSettled(
    clusterIds.map(async (clusterId, slotIndex) => {
      const cluster = await loadCluster(clusterId);
      const theme = await loadTheme(clusterId);
      onProgress({
        phase: "idea-start",
        index: slotIndex + 1,
        total,
        clusterId,
        themeLabel: theme?.theme_label ?? cluster.summary,
      });
      const sampled = samplePapers({
        papers: cluster.papers,
        n: DEFAULT_PAPERS_PER_CLUSTER_PROMPT,
        seed: `${sampleSeed}-c${clusterId}`,
      });
      const proposal = await generateIdeaForCluster({ cluster, theme, samplePapers: sampled });
      onProgress({
        phase: "idea-done",
        index: slotIndex + 1,
        total,
        clusterId,
        title: proposal.title,
      });
      return {
        clusterId,
        cluster,
        theme,
        samplePaperIds: sampled.map((p) => p.paper_id),
        proposal,
      };
    }),
  );

  const failures = settled
    .map((result, slot) => ({ result, clusterId: clusterIds[slot] as number }))
    .filter(
      (entry): entry is { result: PromiseRejectedResult; clusterId: number } =>
        entry.result.status === "rejected",
    );
  if (failures.length > 0) {
    const detail = failures
      .map((f) => {
        const reason = f.result.reason;
        const message = reason instanceof Error ? reason.message : String(reason);
        return `cluster ${f.clusterId}: ${message}`;
      })
      .join("; ");
    throw new Error(`Idea generation failed for ${failures.length}/${total} clusters: ${detail}`);
  }

  const ideas = settled.map((result) => {
    if (result.status !== "fulfilled") {
      throw new Error("unreachable: failures were filtered above");
    }
    return result.value;
  });
  onProgress({ phase: "writing" });

  const deckId = crypto.randomUUID();

  const clusterRows = ideas.map((entry) => {
    const themeLabel = entry.theme?.theme_label ?? entry.cluster.summary;
    return {
      clusterId: entry.clusterId,
      themeLabel,
      summary: entry.cluster.summary,
      description: entry.cluster.description,
      paperCount: entry.cluster.paper_count,
      ideaId: crypto.randomUUID(),
      versionId: crypto.randomUUID(),
      title: entry.proposal.title,
      researchQuestion: entry.proposal.researchQuestion,
      rationale: entry.proposal.rationale,
      proposalMarkdown: entry.proposal.proposalMarkdown,
      samplePaperIds: entry.samplePaperIds,
      anchorPapers: entry.cluster.papers
        .filter((p) => entry.proposal.anchorPaperIds.includes(p.paper_id))
        .map((p) => ({
          paperId: p.paper_id,
          title: p.title,
          authors: p.authors,
          venue: p.venue ?? null,
          year: p.year ?? null,
          url: p.url ?? null,
        })),
    };
  });

  const rows = await runWrite(
    `
    OPTIONAL MATCH (latest:Deck { status: 'active' })
    WITH latest
    ORDER BY latest.generatedAt DESC
    LIMIT 1
    WHERE ($expectedActiveDeckId IS NULL AND latest IS NULL) OR latest.id = $expectedActiveDeckId
    WITH 1 AS proceed
    OPTIONAL MATCH (anyActive:Deck { status: 'active' })
    WITH proceed, collect(anyActive) AS allActive
    FOREACH (a IN allActive | SET a.status = 'archived')
    WITH proceed
    CREATE (d:Deck {
      id: $deckId,
      generatedAt: datetime(),
      modelVersion: $modelVersion,
      sampleSeed: $sampleSeed,
      status: 'active',
      createdBy: $userId
    })
    WITH d
    UNWIND $clusters AS cluster
      MERGE (c:Cluster { clusterId: cluster.clusterId })
      ON CREATE SET
        c.summary = cluster.summary,
        c.description = cluster.description,
        c.paperCount = cluster.paperCount,
        c.themeLabel = cluster.themeLabel
      ON MATCH SET
        c.summary = cluster.summary,
        c.description = cluster.description,
        c.paperCount = cluster.paperCount,
        c.themeLabel = cluster.themeLabel
      MERGE (d)-[:CONTAINS]->(c)
      CREATE (idea:Idea {
        id: cluster.ideaId,
        generatedAt: datetime(),
        modelVersion: $modelVersion,
        promptVersion: $promptVersion,
        samplePaperIds: cluster.samplePaperIds
      })
      MERGE (c)-[:HAS_IDEA]->(idea)
      MERGE (d)-[:HAS_IDEA]->(idea)
      CREATE (v:IdeaVersion {
        id: cluster.versionId,
        ord: 0,
        title: cluster.title,
        researchQuestion: cluster.researchQuestion,
        rationale: cluster.rationale,
        proposalMarkdown: cluster.proposalMarkdown,
        source: 'llm',
        createdAt: datetime()
      })
      MERGE (idea)-[:HAS_VERSION]->(v)
      WITH idea, v, cluster
      UNWIND cluster.anchorPapers AS paper
        MERGE (p:AnchorPaper { paperId: paper.paperId })
        ON CREATE SET
          p.title = paper.title,
          p.authors = paper.authors,
          p.venue = paper.venue,
          p.year = paper.year,
          p.url = paper.url
        ON MATCH SET
          p.title = paper.title,
          p.authors = paper.authors,
          p.venue = paper.venue,
          p.year = paper.year,
          p.url = paper.url
        MERGE (v)-[:CITES]->(p)
    RETURN $deckId AS deckId, count(DISTINCT idea) AS ideaCount
    `,
    {
      deckId,
      modelVersion: env.OPENAI_MODEL,
      promptVersion: PROMPT_VERSION,
      sampleSeed,
      userId: input.triggeredByUserId,
      expectedActiveDeckId: activeDeckBeforeGeneration?.deckId ?? null,
      clusters: clusterRows,
    },
    RegenerateResultSchema,
  );

  const result = requireFirstResult(
    rows,
    "Active deck changed during regeneration. Retry the regeneration request.",
  );
  onProgress({ phase: "done", deckId: result.deckId, ideaCount: result.ideaCount });
  return result;
}

export async function getActiveDeck(): Promise<ActiveDeck | null> {
  const cypher = `
    MATCH (d:Deck { status: 'active' })
    WITH d
    ORDER BY d.generatedAt DESC
    LIMIT 1
    OPTIONAL MATCH (d)-[:HAS_IDEA]->(i:Idea)
    OPTIONAL MATCH (c:Cluster)-[:HAS_IDEA]->(i)
    OPTIONAL MATCH (i)-[:HAS_VERSION]->(v:IdeaVersion)
    WITH d, c, i, v
    ORDER BY v.ord DESC
    WITH d, c, i, head(collect(v)) AS latestVersion
    OPTIONAL MATCH (latestVersion)-[:CITES]->(p:AnchorPaper)
    WITH d, c, i, latestVersion, collect(DISTINCT CASE
      WHEN p IS NULL THEN NULL
      ELSE { paperId: p.paperId, title: p.title, venue: p.venue }
    END) AS anchorsRaw
    ORDER BY c.clusterId
    WITH d, collect({
      ideaId: i.id,
      clusterId: c.clusterId,
      themeLabel: coalesce(c.themeLabel, c.summary),
      latestVersion: {
        title: latestVersion.title,
        researchQuestion: latestVersion.researchQuestion,
        rationale: latestVersion.rationale,
        proposalMarkdown: latestVersion.proposalMarkdown
      },
      anchorPapers: [anchor IN anchorsRaw WHERE anchor IS NOT NULL]
    }) AS ideas
    RETURN d.id AS deckId, toString(d.generatedAt) AS generatedAt, ideas
  `;
  const rows = await runRead(cypher, {}, ActiveDeckSchema);
  const deck = rows[0] ?? null;
  if (!deck) return null;

  return {
    ...deck,
    ideas: deck.ideas.filter((idea) => idea.ideaId.length > 0),
  };
}
