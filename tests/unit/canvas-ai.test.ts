import {
  STICKY_NOTE_ENHANCEMENT_OPTIONS,
  StickyNoteSchema,
  appendStickyNoteVersion,
  buildStickyNote,
  buildStickyNoteEnhancementPrompt,
} from "@/lib/canvas";
import { describe, expect, it } from "vitest";

describe("buildStickyNoteEnhancementPrompt", () => {
  it("builds an AI prompt with canvas, topic, paper, and nearby-note context", () => {
    const prompt = buildStickyNoteEnhancementPrompt({
      noteText: "method needs more detail",
      optionId: "evidence",
      context: {
        boardTitle: "Paper canvas",
        boardSubtitle: "Body Transformation Experiences",
        topicLabel: "Body and XR",
        activePaperTitle: "Body Transformation Experiences",
        relatedPaperTitles: ["Multisensory technology study"],
        otherNotes: ["Compare author confidence before and after critique."],
        themeLabels: ["Method"],
      },
    });

    expect(prompt).toContain("ChatGPT");
    expect(prompt).toContain("method needs more detail");
    expect(prompt).toContain("Body Transformation Experiences");
    expect(prompt).toContain("Compare author confidence");
  });

  it("offers multiple sticky note enhancement configurations", () => {
    expect(STICKY_NOTE_ENHANCEMENT_OPTIONS.map((option) => option.id)).toEqual([
      "clarity",
      "evidence",
      "method",
      "shorten",
      "novelty",
    ]);
  });
});

describe("sticky note versions", () => {
  it("normalizes legacy sticky notes without version history", () => {
    const parsed = StickyNoteSchema.parse({
      id: "note-1",
      text: "Initial sticky",
      x: 10,
      y: 20,
      width: 240,
      height: 180,
      themeIndex: null,
      themeColorToken: null,
      authorUserId: "ziyi-zhang",
      authorHandle: "Ziyi Zhang",
      rotation: 0,
    });

    expect(parsed.versions).toEqual([]);
  });

  it("appends inspectable sticky note versions", () => {
    const note = buildStickyNote({
      authorHandle: "Ziyi Zhang",
      authorUserId: "ziyi-zhang",
      point: { x: 100, y: 120 },
      random: () => 0.5,
    });
    const versioned = appendStickyNoteVersion(
      { ...note, text: "Original sticky" },
      {
        text: "Refined sticky",
        label: "AI enhancement: Clarity",
        source: "ai_enhancement",
        authorHandle: "Ziyi Zhang",
        createdAt: "2026-05-08T00:00:00.000Z",
      },
    );

    expect(versioned.versions).toEqual([
      {
        id: `${note.id}-version-0-20260508000000000`,
        text: "Refined sticky",
        label: "AI enhancement: Clarity",
        source: "ai_enhancement",
        authorHandle: "Ziyi Zhang",
        createdAt: "2026-05-08T00:00:00.000Z",
      },
    ]);
  });
});
