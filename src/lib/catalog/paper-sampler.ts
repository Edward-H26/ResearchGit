import type { CatalogPaper } from "./contracts";
import { makeSeededRng } from "./sampler";

export type SamplePapersInput = {
  papers: ReadonlyArray<CatalogPaper>;
  n: number;
  seed: string;
};

export function samplePapers(input: SamplePapersInput): CatalogPaper[] {
  const { papers, n, seed } = input;
  if (n >= papers.length) {
    return [...papers];
  }

  const rng = makeSeededRng(seed);
  const remaining = [...papers];
  const result: CatalogPaper[] = [];

  while (result.length < n && remaining.length > 0) {
    const idx = Math.floor(rng() * remaining.length);
    const [picked] = remaining.splice(idx, 1);
    if (picked !== undefined) result.push(picked);
  }

  return result;
}
