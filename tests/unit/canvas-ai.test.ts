import { STICKY_NOTE_ENHANCEMENT_OPTIONS, enhanceStickyNoteText } from "@/lib/canvas";
import { describe, expect, it } from "vitest";

describe("enhanceStickyNoteText", () => {
  it("refines a sticky note with the selected configuration", () => {
    const refined = enhanceStickyNoteText(
      "method needs more detail",
      "evidence",
      "Body Transformation Experiences",
    );

    expect(refined).toContain("method needs more detail");
    expect(refined).toContain("Evidence to add");
    expect(refined).toContain("Body Transformation Experiences");
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
