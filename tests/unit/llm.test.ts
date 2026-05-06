import { describe, expect, it, vi } from "vitest";
import { buildDraftNotes, generateIdeaCards } from "../../src/lib/ideas";
import {
  buildClusterThemesPrompt,
  buildGenerateIdeasPrompt,
  buildSynthesizeIdeaPrompt,
} from "../../src/lib/llm/prompts";
import {
  GeneratedIdeasSchema,
  SynthesizedIdeaSchema,
  ThemeClustersSchema,
} from "../../src/lib/llm/schema";
import { getAuthorByName } from "../../src/lib/papers/catalog";

vi.mock("server-only", () => ({}));

function getRequiredAuthor(name = "Yun Huang") {
  const author = getAuthorByName(name);
  if (!author) throw new Error(`${name} is missing from the CHI catalog`);
  return author;
}

describe("llm prompt builders", () => {
  it("includes paper context in the generation prompt", () => {
    const author = getRequiredAuthor();
    const prompt = buildGenerateIdeasPrompt({
      authorName: author.name,
      mode: "selected",
      papers: author.papers.slice(0, 1).map((paper) => ({
        title: paper.title,
        abstract: paper.abstract,
        sessionRoom: paper.sessionRoom,
      })),
    });

    expect(prompt).toContain(author.name);
    expect(prompt).toContain(author.papers[0]?.title ?? "");
  });

  it("builds cluster and synthesis prompts", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    expect(idea).toBeDefined();
    if (!idea) return;

    const notes = buildDraftNotes(idea, author.name);

    expect(buildClusterThemesPrompt(notes)).toContain(notes[0]?.text ?? "");
    expect(buildSynthesizeIdeaPrompt(notes)).toContain("publishable idea");
  });
});

describe("llm schemas", () => {
  it("accepts valid structured outputs", () => {
    expect(
      GeneratedIdeasSchema.safeParse({
        ideas: [
          {
            title: "Idea 1",
            hypothesis: "Hypothesis",
            methodSketch: "Method",
            novelty: ["A", "B"],
            groundingCitations: ["Paper"],
          },
          {
            title: "Idea 2",
            hypothesis: "Hypothesis",
            methodSketch: "Method",
            novelty: ["A", "B"],
            groundingCitations: ["Paper"],
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      ThemeClustersSchema.safeParse({
        themes: [{ label: "Theme", noteIndexes: [0, 1] }],
      }).success,
    ).toBe(true);

    expect(
      SynthesizedIdeaSchema.safeParse({
        title: "Title",
        hypothesis: "Hypothesis",
        methodology: "Method",
        novelty: ["A", "B"],
        citations: ["Paper"],
      }).success,
    ).toBe(true);
  });
});
