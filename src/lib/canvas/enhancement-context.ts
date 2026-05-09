import type { StickyNoteEnhancementContext } from "@/lib/canvas/ai-enhance";
import type { IdeaRecord } from "@/lib/ideas/store-types";
import type { CatalogPaper } from "@/lib/papers/catalog";
import type { CatalogTopic } from "@/lib/recommendation";

type IdeaEnhancementSource = Pick<IdeaRecord, "hypothesis" | "methodology">;
type PaperTitleSource = Pick<CatalogPaper, "id" | "title">;

export function ideaEnhancementSourceSummary(
  idea: IdeaEnhancementSource | null | undefined,
): string | undefined {
  if (!idea) return undefined;
  const summary = [idea.hypothesis, idea.methodology].join("\n").trim();
  return summary || undefined;
}

export function paperTitlesForEnhancement(
  papers: ReadonlyArray<Pick<CatalogPaper, "title">>,
): string[] {
  return papers.map((paper) => paper.title);
}

export function buildIdeaStickyEnhancementContext(input: {
  idea: IdeaEnhancementSource | null | undefined;
  papers: ReadonlyArray<Pick<CatalogPaper, "title">>;
  topicLabel?: string | undefined;
}): Partial<StickyNoteEnhancementContext> {
  const context: Partial<StickyNoteEnhancementContext> = {
    relatedPaperTitles: paperTitlesForEnhancement(input.papers),
  };
  const sourceSummary = ideaEnhancementSourceSummary(input.idea);

  if (input.topicLabel) context.topicLabel = input.topicLabel;
  if (sourceSummary) context.sourceSummary = sourceSummary;

  return context;
}

export function buildTopicStickyEnhancementContext(input: {
  topic: CatalogTopic | null | undefined;
  activePaper: CatalogPaper | null | undefined;
}): Partial<StickyNoteEnhancementContext> {
  const context: Partial<StickyNoteEnhancementContext> = {};

  if (input.topic?.label) context.topicLabel = input.topic.label;
  if (input.activePaper?.title) context.activePaperTitle = input.activePaper.title;
  if (input.activePaper?.abstract) context.sourceSummary = input.activePaper.abstract;

  context.relatedPaperTitles =
    input.topic?.papers
      .filter((paper: PaperTitleSource) => paper.id !== input.activePaper?.id)
      .slice(0, 5)
      .map((paper) => paper.title) ?? [];

  return context;
}
