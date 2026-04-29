import { loadAllThemes, loadCluster } from "../src/lib/catalog/loader";
import { samplePapers } from "../src/lib/catalog/paper-sampler";
import { sampleClusters } from "../src/lib/catalog/sampler";

async function main(): Promise<void> {
  const themes = await loadAllThemes();
  process.stdout.write(`Loaded ${themes.length} themes from all_venues_cluster_themes.json\n\n`);

  const sampledIds = sampleClusters({ seed: "smoke-test-2026-04-27" });
  process.stdout.write(
    `Sampled cluster ids (seed='smoke-test-2026-04-27'): ${sampledIds.join(", ")}\n\n`,
  );

  const firstId = sampledIds[0];
  if (firstId === undefined) {
    throw new Error("Empty sample");
  }

  const detail = await loadCluster(firstId);
  process.stdout.write(`Cluster ${firstId}: ${detail.summary}\n`);
  process.stdout.write(`  ${detail.paper_count} papers in catalog\n`);

  const sampled = samplePapers({ papers: detail.papers, n: 3, seed: `papers-${firstId}` });
  process.stdout.write("  Sampled 3 papers (seeded):\n");
  for (const p of sampled) {
    process.stdout.write(`    - [${p.paper_id}] ${p.title}\n`);
  }
}

void main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
