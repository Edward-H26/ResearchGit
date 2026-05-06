import "server-only";
import type { StickyNote } from "@/lib/canvas/schema";

export function buildGenerateIdeasPrompt(input: {
  authorName: string;
  mode: "selected" | "all";
  papers: Array<{ title: string; abstract: string; sessionRoom: string }>;
}): string {
  return [
    `You are generating 2-3 concrete CHI-ready research ideas for ${input.authorName}.`,
    `Mode: ${input.mode}.`,
    "Each idea must include a title, hypothesis, method sketch, novelty bullets, and grounding citations.",
    "Avoid survey topics and broad problem framing. Bias toward executable interventions and evaluable studies.",
    "",
    "Grounding papers:",
    ...input.papers.map(
      (paper, index) =>
        `${index + 1}. ${paper.title} (${paper.sessionRoom})\nAbstract: ${paper.abstract}`,
    ),
  ].join("\n");
}

export function buildClusterThemesPrompt(notes: StickyNote[]): string {
  return [
    "Cluster the following sticky notes into at most three themes.",
    "Return concise labels that help a CHI author synthesize and publish an idea.",
    "",
    ...notes.map((note, index) => `${index + 1}. ${note.text}`),
  ].join("\n");
}

export function buildSynthesizeIdeaPrompt(notes: StickyNote[]): string {
  return [
    "Synthesize the sticky-note canvas into a publishable idea record.",
    "Return title, hypothesis, methodology, novelty bullets, and grounding citations.",
    "",
    ...notes.map((note, index) => `${index + 1}. ${note.text}`),
  ].join("\n");
}
