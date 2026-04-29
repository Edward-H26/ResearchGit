import { describe, expect, it } from "vitest";
import { makeSeededRng, sampleClusters } from "../../src/lib/catalog/sampler";

describe("sampleClusters", () => {
  it("returns 10 unique cluster ids by default", () => {
    const sample = sampleClusters({ seed: "alpha" });
    expect(sample).toHaveLength(10);
    expect(new Set(sample).size).toBe(10);
  });

  it("ids are within [0, 19]", () => {
    const sample = sampleClusters({ seed: "alpha" });
    for (const id of sample) {
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(20);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = sampleClusters({ seed: "abc" });
    const b = sampleClusters({ seed: "abc" });
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = sampleClusters({ seed: "alpha" });
    const b = sampleClusters({ seed: "beta" });
    expect(a).not.toEqual(b);
  });

  it("can sample fewer than the default", () => {
    const sample = sampleClusters({ seed: "x", n: 3, total: 20 });
    expect(sample).toHaveLength(3);
  });

  it("rejects sampling more than the pool", () => {
    expect(() => sampleClusters({ seed: "x", n: 25, total: 20 })).toThrow(RangeError);
  });

  it("approximates uniform distribution over many samples", () => {
    const counts = new Array(20).fill(0);
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const sample = sampleClusters({ seed: `t-${i}` });
      for (const id of sample) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
    const mean = (trials * 10) / 20;
    for (const c of counts) {
      expect(Math.abs(c - mean)).toBeLessThan(mean * 0.15);
    }
  });
});

describe("makeSeededRng", () => {
  it("returns the same sequence for the same seed", () => {
    const rngA = makeSeededRng("seed1");
    const rngB = makeSeededRng("seed1");
    for (let i = 0; i < 100; i++) {
      expect(rngA()).toBe(rngB());
    }
  });

  it("produces values in [0, 1)", () => {
    const rng = makeSeededRng("range-test");
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
