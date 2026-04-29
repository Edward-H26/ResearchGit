import neo4j from "neo4j-driver";
import { getNeo4jConfig } from "../src/lib/neo4j/config";

const { uri: URI, user: USER, password: PASSWORD } = getNeo4jConfig();

async function main(): Promise<void> {
  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
  try {
    await driver.getServerInfo();
    const session = driver.session();
    try {
      const counts = await session.run(
        `MATCH (n)
         RETURN labels(n) AS labels, count(*) AS count
         ORDER BY count DESC`,
      );
      process.stdout.write(`Database state (${counts.records.length} label sets):\n`);
      for (const record of counts.records) {
        const labels = record.get("labels") as string[];
        const count = record.get("count");
        process.stdout.write(`  ${labels.join(":")}\t${count}\n`);
      }

      const constraints = await session.run("SHOW CONSTRAINTS");
      process.stdout.write(`\n${constraints.records.length} constraints:\n`);
      for (const record of constraints.records) {
        const name = record.get("name");
        const labels = record.get("labelsOrTypes");
        process.stdout.write(`  ${name}\ton ${JSON.stringify(labels)}\n`);
      }
    } finally {
      await session.close();
    }
  } finally {
    await driver.close();
  }
}

void main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
