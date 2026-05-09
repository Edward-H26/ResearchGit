import type { StickyNote } from "@/lib/canvas";
import type { IdeaRecord } from "@/lib/ideas/store-types";

export function withLocalIdeaNotes(
  idea: IdeaRecord | null,
  ideaId: string,
  notes: ReadonlyArray<StickyNote>,
): IdeaRecord | null {
  if (idea?.id !== ideaId) return idea;
  return { ...idea, notes: [...notes], updatedAt: new Date().toISOString() };
}
