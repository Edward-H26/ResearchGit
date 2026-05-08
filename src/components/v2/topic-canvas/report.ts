import type { StickyNote } from "@/lib/canvas";
import type { IdeaRecord } from "@/lib/ideas/store";
import type { CatalogTopic } from "@/lib/recommendation";

export type TopicReport = {
  directions: string[];
  threads: string[];
  nextSteps: string[];
};

function compactNoteText(note: StickyNote): string {
  return note.text.trim().replace(/\s+/g, " ");
}

export function buildTopicReport(topic: CatalogTopic, idea: IdeaRecord): TopicReport {
  const filledNotes = idea.notes.filter((note) => note.text.trim().length > 0);
  const authorHandles = [...new Set(filledNotes.map((note) => note.authorHandle))];
  const noteDirections = filledNotes
    .slice(0, 3)
    .map((note) => compactNoteText(note))
    .filter(Boolean);

  return {
    directions:
      noteDirections.length > 0
        ? noteDirections
        : [
            `Use ${topic.label} as a shared CHI 2026 anchor and invite more sticky notes before synthesis.`,
          ],
    threads: [
      `${filledNotes.length} sticky note(s) from ${authorHandles.length} contributor(s) are attached to this topic canvas.`,
      `${idea.comments.length} comment(s) provide critique, related work, and proposal concerns.`,
      `${topic.papers.length} CHI 2026 paper(s) remain available as reference anchors below the canvas.`,
    ],
    nextSteps: [
      "Invite additional researchers from adjacent papers to add notes.",
      "Cluster convergent sticky notes into proposal directions.",
      "Turn the strongest direction into a shared research proposal draft.",
    ],
  };
}
