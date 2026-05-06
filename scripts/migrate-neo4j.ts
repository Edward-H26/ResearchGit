import neo4j from "neo4j-driver";
import { getNeo4jConfig } from "../src/lib/neo4j/config";

const { uri: URI, user: USER, password: PASSWORD } = getNeo4jConfig();

// V2 schema per SPEC.md §6.
// Note: Paper/Author are loaded in-memory from `papers_by_room.json` at module init
// (see `src/lib/papers/catalog.ts`); they are not Neo4j nodes. Neo4j only stores
// dynamic per-user state: User, Idea, IdeaVersion, Sticky, and Comment.
const CONSTRAINTS: ReadonlyArray<string> = [
  "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
  "CREATE CONSTRAINT user_google IF NOT EXISTS FOR (u:User) REQUIRE u.googleId IS UNIQUE",
  "CREATE CONSTRAINT idea_id IF NOT EXISTS FOR (i:Idea) REQUIRE i.id IS UNIQUE",
  "CREATE CONSTRAINT version_id IF NOT EXISTS FOR (v:IdeaVersion) REQUIRE v.id IS UNIQUE",
  "CREATE CONSTRAINT sticky_id IF NOT EXISTS FOR (s:Sticky) REQUIRE s.id IS UNIQUE",
  "CREATE CONSTRAINT comment_id IF NOT EXISTS FOR (c:Comment) REQUIRE c.id IS UNIQUE",
];

const INDEXES: ReadonlyArray<string> = [
  "CREATE INDEX idea_status IF NOT EXISTS FOR (i:Idea) ON (i.status)",
  "CREATE INDEX idea_updated IF NOT EXISTS FOR (i:Idea) ON (i.updatedAt)",
  "CREATE INDEX comment_idea IF NOT EXISTS FOR (c:Comment) ON (c.ideaId)",
  "CREATE INDEX user_matched_author IF NOT EXISTS FOR (u:User) ON (u.matchedAuthorName)",
];

// One-time V1 → V2 cleanup. Deletes legacy nodes that V2 no longer uses.
// Idempotent (re-running on a clean V2 DB is a no-op).
const V1_CLEANUPS: ReadonlyArray<{ name: string; cypher: string }> = [
  {
    name: "drop_v1_deck_nodes",
    cypher: "MATCH (d:Deck) DETACH DELETE d RETURN count(d) AS removed",
  },
  {
    name: "drop_v1_cluster_nodes",
    cypher: "MATCH (c:Cluster) DETACH DELETE c RETURN count(c) AS removed",
  },
  {
    name: "drop_v1_anchor_paper_nodes",
    cypher: "MATCH (a:AnchorPaper) DETACH DELETE a RETURN count(a) AS removed",
  },
  {
    name: "drop_v2_paper_nodes",
    // Paper nodes were briefly considered for Neo4j ingest. V2 went with
    // in-memory papers from papers_by_room.json instead. Drop any leftovers.
    cypher: "MATCH (p:Paper) DETACH DELETE p RETURN count(p) AS removed",
  },
  {
    name: "drop_v2_author_nodes",
    cypher: "MATCH (a:Author) DETACH DELETE a RETURN count(a) AS removed",
  },
  {
    name: "drop_v1_idea_nodes_without_initiator",
    // V1 Idea nodes lack initiatorUserId. V2 Idea nodes always have it.
    cypher: `
      MATCH (i:Idea)
      WHERE i.initiatorUserId IS NULL
      DETACH DELETE i
      RETURN count(i) AS removed
    `,
  },
  {
    name: "drop_v1_idea_versions_without_v2_fields",
    // V1 IdeaVersion has rationale/researchQuestion fields; V2 carries
    // a snapshot blob instead. Drop versions that look V1-shaped.
    cypher: `
      MATCH (v:IdeaVersion)
      WHERE v.snapshot IS NULL
      DETACH DELETE v
      RETURN count(v) AS removed
    `,
  },
  {
    name: "drop_v1_canvas_nodes",
    cypher: "MATCH (c:Canvas) DETACH DELETE c RETURN count(c) AS removed",
  },
  {
    name: "drop_v1_event_nodes",
    cypher: "MATCH (e:Event) DETACH DELETE e RETURN count(e) AS removed",
  },
  {
    name: "drop_v2_lock_report_nodes",
    cypher: "MATCH (r:LockReport) DETACH DELETE r RETURN count(r) AS removed",
  },
];

function shortLabel(stmt: string): string {
  const match = stmt.match(/(?:CONSTRAINT|INDEX)\s+(\w+)/);
  return match ? (match[1] ?? "?") : "?";
}

async function main(): Promise<void> {
  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
  try {
    const info = await driver.getServerInfo();
    process.stdout.write(`Connected to ${URI} as ${USER} (${info.protocolVersion})\n\n`);

    const session = driver.session();
    try {
      for (const { name, cypher } of V1_CLEANUPS) {
        const result = await session.run(cypher);
        const removed = result.records[0]?.get("removed") ?? 0;
        process.stdout.write(`  cleanup     ${name}  removed=${String(removed)}\n`);
      }
      for (const stmt of CONSTRAINTS) {
        await session.run(stmt);
        process.stdout.write(`  constraint  ${shortLabel(stmt)}\n`);
      }
      for (const stmt of INDEXES) {
        await session.run(stmt);
        process.stdout.write(`  index       ${shortLabel(stmt)}\n`);
      }
    } finally {
      await session.close();
    }

    process.stdout.write(
      `\nApplied ${V1_CLEANUPS.length} cleanups + ${CONSTRAINTS.length} constraints + ${INDEXES.length} indexes.\n`,
    );
  } finally {
    await driver.close();
  }
}

void main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
