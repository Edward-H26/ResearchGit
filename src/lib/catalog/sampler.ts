import { TOTAL_CLUSTERS } from "./constants";

export type SampleClustersInput = {
  seed: string;
  n?: number;
  total?: number;
};

export function sampleClusters(input: SampleClustersInput): number[] {
  const { seed, n = 10, total = TOTAL_CLUSTERS } = input;
  if (n > total) {
    throw new RangeError(`Cannot sample ${n} clusters from a pool of ${total}`);
  }

  const rng = makeSeededRng(seed);
  const pool = Array.from({ length: total }, (_, i) => i);
  return shuffle(pool, rng).slice(0, n);
}

export function makeSeededRng(seed: string): () => number {
  let state = hashFnv1a(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0;
    return state / 0x1_0000_0000;
  };
}

function hashFnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function shuffle<T>(arr: ReadonlyArray<T>, rng: () => number): T[] {
  const remaining = [...arr];
  const result: T[] = [];
  while (remaining.length > 0) {
    const idx = Math.floor(rng() * remaining.length);
    const [picked] = remaining.splice(idx, 1);
    if (picked !== undefined) result.push(picked);
  }
  return result;
}
