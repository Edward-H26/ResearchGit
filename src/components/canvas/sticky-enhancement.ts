import {
  STICKY_NOTE_ENHANCEMENT_OPTIONS,
  type StickyNoteEnhancementContext,
  type StickyNoteEnhancementInput,
  type StickyNoteEnhancementOptionId,
} from "@/lib/canvas/ai-enhance";
import { appendStickyNoteVersion } from "@/lib/canvas/board-utils";
import type { StickyNote, StickyNoteVersion } from "@/lib/canvas/schema";

type StickyEnhancementThemeLabel = {
  label: string;
  compactLabel?: string;
};

export type StickyEnhancementRequest = {
  key: string;
  input: StickyNoteEnhancementInput;
} | null;

type StickyEnhancementContextInput = {
  boardNotes: ReadonlyArray<StickyNote>;
  boardSubtitle: string;
  boardTitle: string;
  enhancingNoteId: string | null;
  enhancementContext: Partial<StickyNoteEnhancementContext> | undefined;
  themeLabels: ReadonlyArray<StickyEnhancementThemeLabel>;
};

export async function requestStickyNoteEnhancement(
  actorName: string,
  input: StickyNoteEnhancementInput,
): Promise<string> {
  const response = await fetch("/api/canvas/enhance-sticky", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorName, ...input }),
  });
  if (!response.ok) throw new Error("sticky_enhancement_failed");
  const result = (await response.json()) as { text?: string };
  if (!result.text) throw new Error("sticky_enhancement_empty");
  return result.text;
}

export function stickyEnhancementOptionLabel(optionId: StickyNoteEnhancementOptionId): string {
  return (
    STICKY_NOTE_ENHANCEMENT_OPTIONS.find((option) => option.id === optionId)?.label ??
    STICKY_NOTE_ENHANCEMENT_OPTIONS[0].label
  );
}

function compactContextText(value: string | undefined, maxLength: number): string | undefined {
  const compacted = value?.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return compacted || undefined;
}

function compactContextList(
  values: ReadonlyArray<string> | undefined,
  limit: number,
  maxLength: number,
): string[] {
  return (values ?? [])
    .map((value) => compactContextText(value, maxLength))
    .filter((value) => value !== undefined)
    .slice(0, limit);
}

export function buildStickyEnhancementContext({
  boardNotes,
  boardSubtitle,
  boardTitle,
  enhancingNoteId,
  enhancementContext,
  themeLabels,
}: StickyEnhancementContextInput): StickyNoteEnhancementContext {
  const customContext = enhancementContext ?? {};
  const boardOtherNotes = boardNotes
    .filter((note) => note.id !== enhancingNoteId && note.text.trim())
    .slice(0, 6)
    .map((note) => note.text.trim());

  return {
    boardTitle:
      compactContextText(customContext.boardTitle ?? boardTitle, 200) ?? "ResearchGit canvas",
    boardSubtitle: compactContextText(customContext.boardSubtitle ?? boardSubtitle, 240),
    topicLabel: compactContextText(customContext.topicLabel, 200),
    activePaperTitle: compactContextText(customContext.activePaperTitle, 300),
    relatedPaperTitles: compactContextList(customContext.relatedPaperTitles, 8, 300),
    sourceSummary: compactContextText(customContext.sourceSummary, 2500),
    themeLabels: compactContextList(
      [
        ...(customContext.themeLabels ?? []),
        ...themeLabels.map((theme) => theme.compactLabel ?? theme.label),
      ],
      8,
      120,
    ),
    otherNotes: compactContextList(
      [...(customContext.otherNotes ?? []), ...boardOtherNotes],
      8,
      600,
    ),
  };
}

export function withAppliedEnhancementVersion(
  note: StickyNote,
  enhancedText: string,
  optionId: StickyNoteEnhancementOptionId,
  authorHandle: string,
): StickyNote {
  const currentVersions = note.versions ?? [];
  const currentText = note.text.trim();
  const lastVersionText = currentVersions.at(-1)?.text.trim();
  const baselineNote =
    currentText && lastVersionText !== currentText
      ? appendStickyNoteVersion(note, {
          text: note.text,
          label: "Before AI enhancement",
          source: "manual",
          authorHandle,
        })
      : note;
  return appendStickyNoteVersion(baselineNote, {
    text: enhancedText,
    label: `AI enhancement: ${stickyEnhancementOptionLabel(optionId)}`,
    source: "ai_enhancement",
    authorHandle,
  });
}

export function withRestoredStickyVersion(
  note: StickyNote,
  version: StickyNoteVersion,
  authorHandle: string,
): StickyNote {
  return appendStickyNoteVersion(note, {
    text: version.text,
    label: `Restored ${version.label}`,
    source: "restore",
    authorHandle,
  });
}
