import neo4j from "neo4j-driver";
import { getNeo4jConfig } from "../src/lib/neo4j/config";

const { uri: URI, user: USER, password: PASSWORD } = getNeo4jConfig();

const CONSTRAINTS: ReadonlyArray<string> = [
  "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
  "CREATE CONSTRAINT user_google IF NOT EXISTS FOR (u:User) REQUIRE u.googleId IS UNIQUE",
  "CREATE CONSTRAINT deck_id IF NOT EXISTS FOR (d:Deck) REQUIRE d.id IS UNIQUE",
  "CREATE CONSTRAINT idea_id IF NOT EXISTS FOR (i:Idea) REQUIRE i.id IS UNIQUE",
  "CREATE CONSTRAINT idea_version_id IF NOT EXISTS FOR (v:IdeaVersion) REQUIRE v.id IS UNIQUE",
  "CREATE CONSTRAINT canvas_id IF NOT EXISTS FOR (c:Canvas) REQUIRE c.id IS UNIQUE",
  "CREATE CONSTRAINT sticky_id IF NOT EXISTS FOR (s:Sticky) REQUIRE s.id IS UNIQUE",
  "CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE",
  "CREATE CONSTRAINT cluster_id IF NOT EXISTS FOR (c:Cluster) REQUIRE c.clusterId IS UNIQUE",
];

const INDEXES: ReadonlyArray<string> = [
  "CREATE INDEX deck_status IF NOT EXISTS FOR (d:Deck) ON (d.status)",
  "CREATE INDEX canvas_lastactivity IF NOT EXISTS FOR (c:Canvas) ON (c.lastActivityAt)",
  "CREATE INDEX event_ts IF NOT EXISTS FOR (e:Event) ON (e.ts)",
  "CREATE INDEX event_kind IF NOT EXISTS FOR (e:Event) ON (e.kind)",
  "CREATE INDEX idea_version_ord IF NOT EXISTS FOR (v:IdeaVersion) ON (v.ord)",
];

const BACKFILLS: ReadonlyArray<{ name: string; cypher: string }> = [
  {
    name: "deck_has_idea_backfill",
    // For each Deck, attach its 1 latest Idea per cluster via the new
    // (:Deck)-[:HAS_IDEA]->(:Idea) edge. Idempotent via MERGE.
    cypher: `
      MATCH (d:Deck)-[:CONTAINS]->(c:Cluster)-[:HAS_IDEA]->(i:Idea)
      WITH d, c, i ORDER BY i.generatedAt DESC
      WITH d, c, head(collect(i)) AS latestIdea
      WHERE latestIdea IS NOT NULL
      MERGE (d)-[:HAS_IDEA]->(latestIdea)
      RETURN count(latestIdea) AS attached
    `,
  },
  {
    name: "archive_stale_active_decks",
    // If multiple decks were left active by past bugs, keep only the most
    // recent as active and archive the rest.
    cypher: `
      MATCH (d:Deck { status: 'active' })
      WITH d ORDER BY d.generatedAt DESC
      WITH collect(d) AS actives
      WITH actives, head(actives) AS keep
      UNWIND actives AS deck
      WITH deck, keep WHERE deck <> keep
      SET deck.status = 'archived'
      RETURN count(deck) AS archived
    `,
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
      for (const stmt of CONSTRAINTS) {
        await session.run(stmt);
        process.stdout.write(`  constraint  ${shortLabel(stmt)}\n`);
      }
      for (const stmt of INDEXES) {
        await session.run(stmt);
        process.stdout.write(`  index       ${shortLabel(stmt)}\n`);
      }
      for (const { name, cypher } of BACKFILLS) {
        const result = await session.run(cypher);
        const first = result.records[0];
        const summary = first
          ? Object.entries(first.toObject())
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(", ")
          : "(no rows)";
        process.stdout.write(`  backfill    ${name}  ${summary}\n`);
      }
    } finally {
      await session.close();
    }

    process.stdout.write(
      `\nApplied ${CONSTRAINTS.length} constraints + ${INDEXES.length} indexes + ${BACKFILLS.length} backfills.\n`,
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
