import "server-only";
import { type IdeaWithVersions, IdeaWithVersionsSchema } from "@/lib/idea/contracts";
import { runRead } from "@/lib/neo4j";

export async function getIdea(ideaId: string): Promise<IdeaWithVersions | null> {
  const cypher = `
    MATCH (i:Idea { id: $ideaId })
    OPTIONAL MATCH (c:Cluster)-[:HAS_IDEA]->(i)
    OPTIONAL MATCH (i)-[:HAS_VERSION]->(v:IdeaVersion)
    OPTIONAL MATCH (author:User)-[:AUTHORED]->(v)
    WITH i, c, v, author
    ORDER BY v.ord ASC
    WITH i, c, collect(CASE
      WHEN v IS NULL THEN NULL
      ELSE {
        id: v.id,
        ord: v.ord,
        title: v.title,
        researchQuestion: v.researchQuestion,
        rationale: v.rationale,
        proposalMarkdown: v.proposalMarkdown,
        source: v.source,
        revisionIntent: coalesce(v.revisionIntent, null),
        changelog: coalesce(v.changelog, null),
        createdAt: toString(v.createdAt),
        createdByHandle: coalesce(author.handle, null)
      }
    END) AS versionsRaw
    OPTIONAL MATCH (i)-[:HAS_VERSION]->(v0:IdeaVersion { ord: 0 })-[:CITES]->(p:AnchorPaper)
    WITH i, c, versionsRaw, collect(CASE
      WHEN p IS NULL THEN NULL
      ELSE {
        paperId: p.paperId,
        title: p.title,
        venue: coalesce(p.venue, null),
        year: coalesce(p.year, null),
        url: coalesce(p.url, null)
      }
    END) AS anchorPapersRaw
    RETURN
      i.id AS ideaId,
      c.clusterId AS clusterId,
      coalesce(c.themeLabel, c.summary) AS themeLabel,
      [version IN versionsRaw WHERE version IS NOT NULL] AS versions,
      [paper IN anchorPapersRaw WHERE paper IS NOT NULL] AS anchorPapers
  `;
  const rows = await runRead(cypher, { ideaId }, IdeaWithVersionsSchema);
  const idea = rows[0] ?? null;
  if (!idea) return null;

  return idea;
}
