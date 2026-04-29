import "server-only";
import { runRead } from "@/lib/neo4j";
import { z } from "zod";

const ExportPayloadSchema = z.object({
  exportedAt: z.string(),
  deck: z
    .object({
      id: z.string(),
      generatedAt: z.string(),
      modelVersion: z.string().nullable(),
      sampleSeed: z.string().nullable(),
    })
    .nullable(),
  ideas: z.array(
    z.object({
      ideaId: z.string(),
      clusterId: z.number().int(),
      themeLabel: z.string(),
      versions: z.array(
        z.object({
          id: z.string(),
          ord: z.number().int(),
          title: z.string(),
          researchQuestion: z.string(),
          rationale: z.string(),
          proposalMarkdown: z.string(),
          source: z.string(),
          revisionIntent: z.string().nullable(),
          changelog: z.string().nullable(),
          createdAt: z.string(),
        }),
      ),
      anchorPapers: z.array(
        z.object({
          paperId: z.string(),
          title: z.string(),
          venue: z.string().nullable(),
        }),
      ),
      stickies: z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          intent: z.string(),
          authorUserId: z.string(),
          authorHandle: z.string(),
          rotation: z.number(),
        }),
      ),
    }),
  ),
  events: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      ts: z.string(),
      payload: z.string(),
    }),
  ),
});
export type ExportPayload = z.infer<typeof ExportPayloadSchema>;

const DeckRowSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  modelVersion: z.string().nullable(),
  sampleSeed: z.string().nullable(),
});

const IdeaRowSchema = z.object({
  ideaId: z.string(),
  clusterId: z.number().int(),
  themeLabel: z.string(),
  versions: ExportPayloadSchema.shape.ideas.element.shape.versions,
  anchorPapers: ExportPayloadSchema.shape.ideas.element.shape.anchorPapers,
  stickies: ExportPayloadSchema.shape.ideas.element.shape.stickies,
});

const EventRowSchema = ExportPayloadSchema.shape.events.element;

export async function buildResearchExport(): Promise<ExportPayload> {
  const deckRows = await runRead(
    `
    MATCH (d:Deck { status: 'active' })
    RETURN d.id AS id,
      toString(d.generatedAt) AS generatedAt,
      coalesce(d.modelVersion, null) AS modelVersion,
      coalesce(d.sampleSeed, null) AS sampleSeed
    ORDER BY d.generatedAt DESC
    LIMIT 1
    `,
    {},
    DeckRowSchema,
  );
  const deck = deckRows[0] ?? null;

  const ideaRows = deck
    ? await runRead(
        `
        MATCH (d:Deck { id: $deckId })-[:CONTAINS]->(c:Cluster)-[:HAS_IDEA]->(i:Idea)
        OPTIONAL MATCH (i)-[:HAS_VERSION]->(v:IdeaVersion)
        WITH i, c, v ORDER BY v.ord ASC
        WITH i, c,
          [version IN collect(v) WHERE version IS NOT NULL |
            {
              id: version.id,
              ord: version.ord,
              title: version.title,
              researchQuestion: version.researchQuestion,
              rationale: version.rationale,
              proposalMarkdown: version.proposalMarkdown,
              source: version.source,
              revisionIntent: coalesce(version.revisionIntent, null),
              changelog: coalesce(version.changelog, null),
              createdAt: toString(version.createdAt)
            }
          ] AS versions
        OPTIONAL MATCH (i)-[:HAS_VERSION { ord: 0 }]-(:IdeaVersion)-[:CITES]->(p:AnchorPaper)
        WITH i, c, versions,
          [paper IN collect(DISTINCT p) WHERE paper IS NOT NULL |
            { paperId: paper.paperId, title: paper.title, venue: coalesce(paper.venue, null) }
          ] AS anchorPapers
        OPTIONAL MATCH (i)-[:HAS_CANVAS]->(canvas:Canvas)-[:HAS_STICKY]->(s:Sticky)
        WITH i, c, versions, anchorPapers,
          [sticky IN collect(DISTINCT s) WHERE sticky IS NOT NULL |
            {
              id: sticky.id,
              text: sticky.text,
              x: sticky.x,
              y: sticky.y,
              width: sticky.width,
              height: sticky.height,
              intent: sticky.intent,
              authorUserId: sticky.authorUserId,
              authorHandle: sticky.authorHandle,
              rotation: sticky.rotation
            }
          ] AS stickies
        RETURN i.id AS ideaId,
          c.clusterId AS clusterId,
          coalesce(c.themeLabel, c.summary) AS themeLabel,
          versions, anchorPapers, stickies
        ORDER BY c.clusterId
        `,
        { deckId: deck.id },
        IdeaRowSchema,
      )
    : [];

  const eventRows = await runRead(
    `
    MATCH (e:Event)
    RETURN e.id AS id, e.kind AS kind, toString(e.ts) AS ts, e.payload AS payload
    ORDER BY e.ts ASC
    LIMIT 50000
    `,
    {},
    EventRowSchema,
  );

  return {
    exportedAt: new Date().toISOString(),
    deck,
    ideas: ideaRows,
    events: eventRows,
  };
}
