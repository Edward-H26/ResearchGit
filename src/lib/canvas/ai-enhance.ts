export const STICKY_NOTE_ENHANCEMENT_OPTIONS = [
  {
    id: "clarity",
    label: "Clarity",
    heading: "Refined note",
  },
  {
    id: "evidence",
    label: "Evidence",
    heading: "Evidence to add",
  },
  {
    id: "method",
    label: "Method",
    heading: "Method detail",
  },
  {
    id: "shorten",
    label: "Shorten",
    heading: "Condensed note",
  },
  {
    id: "novelty",
    label: "Novelty",
    heading: "Contribution angle",
  },
] as const;

export type StickyNoteEnhancementOptionId = (typeof STICKY_NOTE_ENHANCEMENT_OPTIONS)[number]["id"];

function compactText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function sentence(value: string): string {
  const compacted = compactText(value);
  if (!compacted) return "Clarify the claim, evidence, and next action for this sticky note.";
  return /[.!?]$/.test(compacted) ? compacted : `${compacted}.`;
}

function optionHeading(optionId: StickyNoteEnhancementOptionId): string {
  return (
    STICKY_NOTE_ENHANCEMENT_OPTIONS.find((option) => option.id === optionId)?.heading ??
    STICKY_NOTE_ENHANCEMENT_OPTIONS[0].heading
  );
}

export function enhanceStickyNoteText(
  text: string,
  optionId: StickyNoteEnhancementOptionId,
  contextTitle = "the current draft",
): string {
  const source = sentence(text);
  const context = compactText(contextTitle) || "the current draft";
  const heading = optionHeading(optionId);

  if (optionId === "shorten") {
    return `${heading}:\n${source.split(" ").slice(0, 24).join(" ")}`;
  }

  if (optionId === "evidence") {
    return `${heading}:\n${source}\nConnect this point to ${context}, then name the paper detail, user behavior, or evaluation signal that would support it.`;
  }

  if (optionId === "method") {
    return `${heading}:\n${source}\nSpecify the prototype, participants, comparison condition, and success measure needed to test this claim.`;
  }

  if (optionId === "novelty") {
    return `${heading}:\n${source}\nFrame the CHI contribution as the new design capability, empirical insight, or workflow that this note makes possible.`;
  }

  return `${heading}:\n${source}\nMake the claim specific, grounded, and actionable for the next draft revision.`;
}
