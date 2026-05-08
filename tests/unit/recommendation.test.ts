import { getAuthorByName, getAuthors } from "@/lib/papers/catalog";
import {
  getCatalogTopicById,
  getCatalogTopics,
  recommendAdditionalTopicsForAuthor,
  recommendPapersForAuthor,
  recommendTopicsForAuthor,
} from "@/lib/recommendation";
import {
  jaccardScore,
  sharedRecommendationTokens,
  tokenizeRecommendationText,
} from "@/lib/recommendation/scoring";
import { describe, expect, it } from "vitest";

function getRequiredAuthor(name = "Yun Huang") {
  const author = getAuthorByName(name);
  if (!author) throw new Error(`${name} is missing from the CHI catalog`);
  return author;
}

describe("recommendPapersForAuthor", () => {
  it("returns at most `limit` papers", () => {
    const author = getRequiredAuthor().name;
    const recs = recommendPapersForAuthor(author, 5);
    expect(recs.length).toBeLessThanOrEqual(5);
  });

  it("does not recommend the author's own papers", () => {
    const author = getRequiredAuthor();
    const ownIds = new Set(author.papers.map((p) => p.id));
    const recs = recommendPapersForAuthor(author.name, 10);
    for (const rec of recs) {
      expect(ownIds.has(rec.paper.id)).toBe(false);
    }
  });

  it("orders by descending score", () => {
    const author = getRequiredAuthor().name;
    const recs = recommendPapersForAuthor(author, 8);
    for (let i = 1; i < recs.length; i++) {
      const prev = recs[i - 1];
      const curr = recs[i];
      if (!prev || !curr) continue;
      expect(prev.score).toBeGreaterThanOrEqual(curr.score);
    }
  });

  it("is deterministic across calls", () => {
    const author = getRequiredAuthor().name;
    const a = recommendPapersForAuthor(author, 5).map((r) => r.paper.id);
    const b = recommendPapersForAuthor(author, 5).map((r) => r.paper.id);
    expect(a).toEqual(b);
  });

  it("returns empty array for unknown author", () => {
    expect(recommendPapersForAuthor("definitely-not-a-real-author-xyz", 5)).toEqual([]);
  });
});

describe("recommendation scoring helpers", () => {
  it("tokenizes reusable recommendation text", () => {
    expect([...tokenizeRecommendationText("Human-AI, AI and HCI")].sort()).toEqual(["human"]);
  });

  it("computes a deterministic Jaccard score", () => {
    expect(jaccardScore(new Set(["agent", "paper"]), new Set(["agent", "design"]))).toBe(1 / 3);
  });

  it("returns sorted shared tokens for rationales", () => {
    expect(
      sharedRecommendationTokens(
        new Set(["paper", "agent", "workflow"]),
        new Set(["agent", "design", "paper"]),
      ),
    ).toEqual(["agent", "paper"]);
  });
});

describe("recommendTopicsForAuthor", () => {
  it("returns topic recommendations with same-topic papers", () => {
    const author = getRequiredAuthor();
    const recs = recommendTopicsForAuthor(author.name, 5);
    expect(recs.length).toBeGreaterThan(0);
    for (const rec of recs) {
      expect(rec.topic.papers.length).toBeGreaterThan(0);
      expect(rec.recommendedPapers.length).toBeGreaterThan(0);
      expect(rec.rationale.length).toBeGreaterThan(0);
    }
  });

  it("orders topics by descending score", () => {
    const author = getRequiredAuthor().name;
    const recs = recommendTopicsForAuthor(author, 8);
    for (let i = 1; i < recs.length; i++) {
      const prev = recs[i - 1];
      const curr = recs[i];
      if (!prev || !curr) continue;
      expect(prev.score).toBeGreaterThanOrEqual(curr.score);
    }
  });

  it("can look up a recommended topic by id", () => {
    const topic = recommendTopicsForAuthor("Yun Huang", 1)[0]?.topic;
    expect(topic).toBeDefined();
    if (!topic) return;
    expect(getCatalogTopicById(topic.id)?.label).toBe(topic.label);
  });

  it("uses one session topic for a one-paper author", () => {
    const recs = recommendTopicsForAuthor("Ziyi Zhang", 5);

    expect(recs).toHaveLength(1);
    expect(recs[0]?.topic.source).toBe("Session: P1 - Room 122");
    expect(recs[0]?.topic.label.toLowerCase()).toBe("ai in practice");
  });

  it("generates keyword-driven additional session topics", () => {
    const recs = recommendAdditionalTopicsForAuthor("Ziyi Zhang", "latency timing agents", 5);

    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((rec) => rec.topic.source.startsWith("Session:"))).toBe(true);
    expect(recs.some((rec) => rec.topic.label.toLowerCase().includes("timing"))).toBe(true);
  });

  it("returns empty array for unknown author", () => {
    expect(recommendTopicsForAuthor("not-a-real-author-xyz", 5)).toEqual([]);
  });

  it("catalog sanity: catalog has many authors", () => {
    expect(getAuthors().length).toBeGreaterThan(50);
  });

  it("catalog sanity: catalog has many broader topics", () => {
    expect(getCatalogTopics().length).toBeGreaterThan(20);
  });
});
