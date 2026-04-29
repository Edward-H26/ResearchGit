import { promises as fs } from "node:fs";
import path from "node:path";
import { getCatalogRoot } from "../src/lib/catalog/paths";

const CATALOG_DIR = path.join(getCatalogRoot(), "cluster_details");
const NAN_PATTERN = /(?<=[:,\[]\s*)NaN(?=\s*[,}\]])/g;

type FileResult = {
  file: string;
  replacements: number;
};

async function sanitizeFile(filePath: string): Promise<FileResult> {
  const raw = await fs.readFile(filePath, "utf8");
  const matches = raw.match(NAN_PATTERN);
  const replacements = matches ? matches.length : 0;

  if (replacements === 0) {
    return { file: path.basename(filePath), replacements: 0 };
  }

  const cleaned = raw.replace(NAN_PATTERN, "null");

  try {
    JSON.parse(cleaned);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Sanitized output for ${filePath} fails JSON.parse: ${reason}`);
  }

  await fs.writeFile(filePath, cleaned, "utf8");
  return { file: path.basename(filePath), replacements };
}

async function main(): Promise<void> {
  const entries = await fs.readdir(CATALOG_DIR);
  const targets = entries
    .filter((name) => /^cluster_\d+\.json$/.test(name))
    .map((name) => path.join(CATALOG_DIR, name))
    .sort();

  let total = 0;
  for (const target of targets) {
    const result = await sanitizeFile(target);
    total += result.replacements;
    process.stdout.write(`${result.file.padEnd(20)} ${result.replacements} NaN -> null\n`);
  }
  process.stdout.write(`\nTotal: ${total} NaN literals replaced across ${targets.length} files.\n`);
}

void main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
