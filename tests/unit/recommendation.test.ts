import { getAuthorByName, getAuthors } from "@/lib/papers/catalog";
import { recommendCollaboratorsForAuthor, recommendPapersForAuthor } from "@/lib/recommendation";
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

describe("recommendCollaboratorsForAuthor", () => {
  it("does not recommend the author themselves", () => {
    const author = getRequiredAuthor();
    const recs = recommendCollaboratorsForAuthor(author.name, 5);
    for (const rec of recs) {
      expect(rec.author.normalizedName).not.toBe(author.normalizedName);
    }
  });

  it("each entry has a track and rationale", () => {
    const author = getRequiredAuthor().name;
    const recs = recommendCollaboratorsForAuthor(author, 4);
    for (const rec of recs) {
      expect(["with-you", "stretch-you"]).toContain(rec.track);
      expect(rec.rationale.length).toBeGreaterThan(0);
    }
  });

  it("respects per-track limit", () => {
    const author = getRequiredAuthor().name;
    const recs = recommendCollaboratorsForAuthor(author, 3);
    const withYou = recs.filter((r) => r.track === "with-you");
    const stretch = recs.filter((r) => r.track === "stretch-you");
    expect(withYou.length).toBeLessThanOrEqual(3);
    expect(stretch.length).toBeLessThanOrEqual(3);
  });

  it("returns empty array for unknown author", () => {
    expect(recommendCollaboratorsForAuthor("not-a-real-author-xyz", 5)).toEqual([]);
  });

  it("catalog sanity: catalog has many authors", () => {
    expect(getAuthors().length).toBeGreaterThan(50);
  });
});
