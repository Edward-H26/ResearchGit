import type { StickyThemeLabel } from "@/components/canvas";
import type { StickyNote } from "@/lib/canvas";
import { THEME_DISPLAY_DEFINITIONS, UNGROUPED_THEME_INDEX } from "@/lib/ideas";

export function visibleThemeLabelsForNotes(
  notes: ReadonlyArray<Pick<StickyNote, "themeIndex">>,
): StickyThemeLabel[] {
  return THEME_DISPLAY_DEFINITIONS.filter((theme) =>
    notes.some((note) => note.themeIndex === theme.index),
  ).map((theme) => ({
    ...theme,
    isUngrouped: theme.index === UNGROUPED_THEME_INDEX,
  }));
}
