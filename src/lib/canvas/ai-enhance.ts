export const STICKY_NOTE_ENHANCEMENT_OPTIONS = [
  {
    id: "clarity",
    label: "Clarity",
    instruction: "Rewrite the note so the research claim is precise, grounded, and easy to act on.",
  },
  {
    id: "evidence",
    label: "Evidence",
    instruction:
      "Rewrite the note to name the paper evidence, user behavior, or evaluation signal needed to support it.",
  },
  {
    id: "method",
    label: "Method",
    instruction:
      "Rewrite the note as a method-oriented contribution with prototype, participants, comparison, and measurement details.",
  },
  {
    id: "shorten",
    label: "Shorten",
    instruction:
      "Rewrite the note into a concise sticky note while preserving the core research implication.",
  },
  {
    id: "novelty",
    label: "Novelty",
    instruction:
      "Rewrite the note to foreground the CHI contribution, including what is new and why it matters.",
  },
] as const;

export type StickyNoteEnhancementOptionId = (typeof STICKY_NOTE_ENHANCEMENT_OPTIONS)[number]["id"];

export type StickyNoteEnhancementContext = {
  boardTitle: string;
  boardSubtitle?: string | undefined;
  topicLabel?: string | undefined;
  activePaperTitle?: string | undefined;
  relatedPaperTitles?: string[] | undefined;
  sourceSummary?: string | undefined;
  themeLabels?: string[] | undefined;
  otherNotes?: string[] | undefined;
};

export type StickyNoteEnhancementInput = {
  noteText: string;
  optionId: StickyNoteEnhancementOptionId;
  context: StickyNoteEnhancementContext;
};

function compactText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function stickyNoteEnhancementOption(
  optionId: StickyNoteEnhancementOptionId,
): (typeof STICKY_NOTE_ENHANCEMENT_OPTIONS)[number] {
  return (
    STICKY_NOTE_ENHANCEMENT_OPTIONS.find((option) => option.id === optionId) ??
    STICKY_NOTE_ENHANCEMENT_OPTIONS[0]
  );
}

function listSection(label: string, values: ReadonlyArray<string> | undefined): string[] {
  const cleaned = (values ?? []).map(compactText).filter(Boolean).slice(0, 6);
  if (cleaned.length === 0) return [];
  return [label, ...cleaned.map((value, index) => `${index + 1}. ${value}`)];
}

export function buildStickyNoteEnhancementPrompt(input: StickyNoteEnhancementInput): string {
  const option = stickyNoteEnhancementOption(input.optionId);
  const context = input.context;
  const sourceSummary = compactText(context.sourceSummary ?? "");
  return [
    "You are ChatGPT helping a CHI 2026 researcher refine one sticky note for a shared ResearchGit canvas.",
    "Return only the improved sticky note text. Do not include headings, markdown, prefaces, or explanations.",
    "Keep the output under 120 words and preserve the user's intent.",
    option.instruction,
    "",
    `Canvas: ${compactText(context.boardTitle) || "ResearchGit canvas"}`,
    context.boardSubtitle ? `Canvas subtitle: ${compactText(context.boardSubtitle)}` : "",
    context.topicLabel ? `Broader topic: ${compactText(context.topicLabel)}` : "",
    context.activePaperTitle ? `Active paper: ${compactText(context.activePaperTitle)}` : "",
    sourceSummary ? `Source summary: ${sourceSummary.slice(0, 1200)}` : "",
    "",
    "Original sticky note:",
    compactText(input.noteText) || "Untitled note",
    "",
    ...listSection("Related papers:", context.relatedPaperTitles),
    "",
    ...listSection("Nearby canvas notes:", context.otherNotes),
    "",
    ...listSection("Canvas themes:", context.themeLabels),
  ]
    .filter((line) => line !== "")
    .join("\n");
}
