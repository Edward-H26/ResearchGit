import type { IdeaFields, IdeaRecord } from "@/lib/ideas/store";

export function parseIdeaList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function fieldsFromIdeaRecord(idea: IdeaRecord): IdeaFields {
  return {
    title: idea.title,
    hypothesis: idea.hypothesis,
    methodology: idea.methodology,
    novelty: idea.novelty,
    citations: idea.citations,
  };
}
