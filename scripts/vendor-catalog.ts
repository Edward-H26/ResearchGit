import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const SOURCE_BASE_ENV = process.env.RESEARCHGALAXY_PATH;
const DEFAULT_SOURCE_BASE = path.join(homedir(), "Desktop", "ProjectResearchGala");
const SOURCE_BASE = SOURCE_BASE_ENV ?? DEFAULT_SOURCE_BASE;

const CLUSTER_DETAILS_RELATIVE = path.join(
  "ResearchGalaxy-",
  "research-galaxy-next demo",
  "public",
  "assets",
  "cluster_details",
);
const THEMES_RELATIVE = path.join(
  "ResearchGalaxy-",
  "demo_data",
  "merged",
  "all_venues_cluster_themes.json",
);

const DEST_DIR = path.join(process.cwd(), "public", "catalog");
const DEST_CLUSTERS_DIR = path.join(DEST_DIR, "cluster_details");
const DEST_THEMES_FILE = path.join(DEST_DIR, "all_venues_cluster_themes.json");

const NAN_PATTERN = /(?<=[:,\[]\s*)NaN(?=\s*[,}\]])/g;

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyAndSanitize(srcFile: string, dstFile: string): Promise<number> {
  const raw = await fs.readFile(srcFile, "utf8");
  const matches = raw.match(NAN_PATTERN);
  const replacements = matches ? matches.length : 0;
  const cleaned = replacements > 0 ? raw.replace(NAN_PATTERN, "null") : raw;
  if (replacements > 0) {
    JSON.parse(cleaned);
  }
  await fs.writeFile(dstFile, cleaned, "utf8");
  return replacements;
}

async function main(): Promise<void> {
  if (!(await pathExists(SOURCE_BASE))) {
    process.stderr.write(
      [
        `Source not found: ${SOURCE_BASE}`,
        "",
        "Set RESEARCHGALAXY_PATH to the directory containing the ResearchGalaxy- folder, or",
        `place the data at the default location: ${DEFAULT_SOURCE_BASE}`,
        "",
        "Example:",
        "  RESEARCHGALAXY_PATH=/path/to/ProjectResearchGala pnpm vendor-catalog",
      ].join("\n"),
    );
    process.exit(1);
  }

  const clustersSrc = path.join(SOURCE_BASE, CLUSTER_DETAILS_RELATIVE);
  const themesSrc = path.join(SOURCE_BASE, THEMES_RELATIVE);

  if (!(await pathExists(clustersSrc))) {
    process.stderr.write(`Cluster details not found at: ${clustersSrc}\n`);
    process.exit(1);
  }
  if (!(await pathExists(themesSrc))) {
    process.stderr.write(`Themes file not found at: ${themesSrc}\n`);
    process.exit(1);
  }

  await ensureDir(DEST_CLUSTERS_DIR);

  const entries = await fs.readdir(clustersSrc);
  const clusterFiles = entries.filter((name) => /^cluster_\d+\.json$/.test(name)).sort();

  let totalNanReplacements = 0;
  for (const name of clusterFiles) {
    const srcFile = path.join(clustersSrc, name);
    const dstFile = path.join(DEST_CLUSTERS_DIR, name);
    const replaced = await copyAndSanitize(srcFile, dstFile);
    totalNanReplacements += replaced;
    process.stdout.write(`  ${name.padEnd(20)} ${replaced} NaN -> null\n`);
  }

  await copyAndSanitize(themesSrc, DEST_THEMES_FILE);

  process.stdout.write(
    `\nVendored ${clusterFiles.length} cluster files + themes from ${SOURCE_BASE}\n`,
  );
  process.stdout.write(`Sanitized ${totalNanReplacements} NaN literals.\n`);
  process.stdout.write(`Destination: ${DEST_DIR}\n`);
}

void main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
