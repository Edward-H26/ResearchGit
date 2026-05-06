import {
  UNGROUPED_THEME_INDEX,
  applyThemesToNotes,
  buildDraftNotes,
  clusterNotesIntoThemes,
  generateIdeaCards,
  previewDraftEnhancement,
  synthesizeIdeaFromNotes,
} from "@/lib/ideas";
import {
  type IdeaFields,
  type IdeaVersionTrigger,
  addCommentToIdeaInState,
  createIdeaFromCardInState,
  deleteIdeaInState,
  getIdeasForAuthorFromState,
  initialIdeaStoreState,
  normalizeIdeaStoreState,
  publishIdeaInState,
  restoreDraftVersionInState,
  saveDraftVersionInState,
  saveIdeaNotesInState,
  saveTopicRecommendationCountInState,
  toggleIdeaUpvoteInState,
} from "@/lib/ideas/store";
import { findCHIAuthorMatches, getAuthorByName, getPaperById } from "@/lib/papers/catalog";
import { describe, expect, it } from "vitest";

function getRequiredAuthor(name = "Yun Huang") {
  const author = getAuthorByName(name);
  if (!author) throw new Error(`${name} is missing from the CHI catalog`);
  return author;
}

describe("generateIdeaCards", () => {
  it("returns at most 3 cards", () => {
    const author = getRequiredAuthor().name;
    const cards = generateIdeaCards([], author);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(3);
  });

  it("each card has required structured fields", () => {
    const author = getRequiredAuthor().name;
    const cards = generateIdeaCards([], author);
    for (const card of cards) {
      expect(card.id.length).toBeGreaterThan(0);
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.hypothesis.length).toBeGreaterThan(0);
      expect(card.methodSketch.length).toBeGreaterThan(0);
      expect(card.novelty.length).toBeGreaterThanOrEqual(2);
      expect(card.novelty.length).toBeLessThanOrEqual(3);
      expect(card.groundingPaperIds.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for the same author + selection", () => {
    const author = getRequiredAuthor().name;
    const a = generateIdeaCards([], author);
    const b = generateIdeaCards([], author);
    expect(a).toEqual(b);
  });

  it("respects explicit paper selection when provided", () => {
    const author = getRequiredAuthor();
    const firstPaper = author.papers[0];
    if (!firstPaper) return;
    const cards = generateIdeaCards([firstPaper.id], author.name);
    expect(cards[0]?.groundingPaperIds).toContain(firstPaper.id);
  });

  it("uses the real selected paper in generated card and synthesis text", () => {
    const author = getRequiredAuthor();
    const paper = author.papers[0];
    if (!paper) throw new Error("author has no source paper");
    const card = generateIdeaCards([paper.id], author.name)[0];
    if (!card) throw new Error("no idea generated");
    const notes = buildDraftNotes(card, author.name);
    const synthesis = synthesizeIdeaFromNotes(card, notes);

    expect(card.title).toContain(paper.title);
    expect(card.methodSketch).toContain(paper.title);
    expect(synthesis.methodology).toContain(paper.title);
    expect(synthesis.methodology).toContain(paper.abstract.slice(0, 80));
  });

  it("falls back to recommendations when selection is empty or unknown", () => {
    const author = getRequiredAuthor().name;
    const cards = generateIdeaCards(["not-a-real-paper-id"], author);
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe("clusterNotesIntoThemes + applyThemesToNotes", () => {
  it("produces at most 3 AI themes plus an ungrouped bucket", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    if (!idea) throw new Error("no idea generated");
    const notes = buildDraftNotes(idea, author.name);
    const themes = clusterNotesIntoThemes(notes);
    const aiThemes = themes.filter((theme) => theme.index !== UNGROUPED_THEME_INDEX);
    expect(aiThemes.length).toBeLessThanOrEqual(3);
  });

  it("assigns every note to exactly one theme", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    if (!idea) throw new Error("no idea generated");
    const notes = buildDraftNotes(idea, author.name);
    const themes = clusterNotesIntoThemes(notes);
    const flat = themes.flatMap((t) => t.noteIds);
    expect(flat.sort()).toEqual(notes.map((n) => n.id).sort());
  });

  it("gives draft notes stable unique ids", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    if (!idea) throw new Error("no idea generated");
    const notes = buildDraftNotes(idea, author.name);
    const ids = notes.map((note) => note.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves weak outlier notes ungrouped", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    if (!idea) throw new Error("no idea generated");
    const notes = buildDraftNotes(idea, author.name);
    const firstNote = notes[0];
    if (!firstNote) throw new Error("no draft notes generated");
    const outlier = { ...firstNote, id: "outlier-note", text: "Untitled note" };
    const themes = clusterNotesIntoThemes([...notes, outlier]);
    const ungrouped = themes.find((theme) => theme.index === UNGROUPED_THEME_INDEX);
    expect(ungrouped?.noteIds).toContain(outlier.id);
  });

  it("colors each sticky according to its theme", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    if (!idea) throw new Error("no idea generated");
    const notes = buildDraftNotes(idea, author.name);
    const colored = applyThemesToNotes(notes);
    for (const note of colored) {
      expect(note.themeIndex).not.toBeNull();
      expect(note.themeColorToken).not.toBeNull();
    }
  });

  it("groups themed stickies into separate canvas columns", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    if (!idea) throw new Error("no idea generated");
    const notes = buildDraftNotes(idea, author.name);
    const themed = applyThemesToNotes(notes);
    const groupedXPositions = new Map<number, Set<number>>();

    for (const note of themed) {
      if (note.themeIndex === null) throw new Error("note missing theme");
      const positions = groupedXPositions.get(note.themeIndex) ?? new Set<number>();
      positions.add(note.x);
      groupedXPositions.set(note.themeIndex, positions);
    }

    for (const positions of groupedXPositions.values()) {
      expect(positions.size).toBe(1);
    }
    expect(
      new Set([...groupedXPositions.values()].map((positions) => [...positions][0])).size,
    ).toBe(groupedXPositions.size);
  });
});

describe("synthesizeIdeaFromNotes", () => {
  it("produces a structured publishable idea", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    if (!idea) throw new Error("no idea generated");
    const notes = buildDraftNotes(idea, author.name);
    const synth = synthesizeIdeaFromNotes(idea, notes);
    expect(synth.title).toBe(idea.title);
    expect(synth.methodology.length).toBeGreaterThan(0);
    expect(synth.novelty.length).toBeGreaterThan(0);
    expect(synth.citations.length).toBeGreaterThan(0);
  });

  it("keeps real paper context even when the canvas notes are blank", () => {
    const author = getRequiredAuthor();
    const idea = generateIdeaCards([], author.name)[0];
    if (!idea) throw new Error("no idea generated");
    const notes = buildDraftNotes(idea, author.name);
    const blanked = notes.map((n) => ({ ...n, text: "" }));
    const synth = synthesizeIdeaFromNotes(idea, blanked);
    const paper = getPaperById(idea.groundingPaperIds[0] ?? "");
    if (!paper) throw new Error("source paper is missing");
    expect(synth.methodology).toContain(paper.title);
    expect(synth.methodology).not.toContain("Canvas synthesis");
  });
});

describe("draft AI enhancement versions", () => {
  it("previews enhanced fields and a new sticky from a revision intent", () => {
    const author = getRequiredAuthor("Yun Huang");
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const created = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    const draft = created.idea;
    if (!draft) throw new Error("draft was not created");
    const preview = previewDraftEnhancement({
      idea: draft,
      notes: draft.notes,
      intent: "Strengthen the evaluation plan",
      trigger: "ai_quick_action",
    });

    expect(preview.fields.methodology).toContain("AI enhancement plan");
    expect(preview.fields.methodology).toContain("Strengthen the evaluation plan");
    expect(preview.notes).toHaveLength(draft.notes.length + 1);
    expect(preview.notes.at(-1)?.text).toContain("AI enhancement");
    expect(preview.summary).toContain("Strengthen the evaluation plan");
  });

  it("accepts an AI draft enhancement as a saved version snapshot", () => {
    const author = getRequiredAuthor("Yun Huang");
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const created = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    const draft = created.idea;
    if (!draft) throw new Error("draft was not created");
    const trigger: IdeaVersionTrigger = "ai_quick_action";
    const preview = previewDraftEnhancement({
      idea: draft,
      notes: draft.notes,
      intent: "Strengthen the evaluation plan",
      trigger,
    });
    const saved = saveDraftVersionInState(
      created.state,
      draft.id,
      preview.fields,
      preview.notes,
      trigger,
      preview.summary,
      author.name,
    );
    if (!saved.idea) throw new Error("draft version was not saved");

    expect(saved.idea.status).toBe("draft");
    expect(saved.idea.versions).toHaveLength(1);
    expect(saved.idea.versions[0]?.trigger).toBe(trigger);
    expect(saved.idea.versions[0]?.summary).toContain("Strengthen the evaluation plan");
    expect(saved.idea.versions[0]?.fields.methodology).toContain("AI enhancement plan");
    expect(saved.idea.versions[0]?.notes).toEqual(preview.notes);
    expect(saved.idea.notes).toEqual(preview.notes);
  });

  it("restores a draft from a saved AI version snapshot", () => {
    const author = getRequiredAuthor("Yun Huang");
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const created = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    const draft = created.idea;
    if (!draft) throw new Error("draft was not created");
    const preview = previewDraftEnhancement({
      idea: draft,
      notes: draft.notes,
      intent: "Tighten novelty",
      trigger: "ai_custom_prompt",
    });
    const saved = saveDraftVersionInState(
      created.state,
      draft.id,
      preview.fields,
      preview.notes,
      "ai_custom_prompt",
      preview.summary,
      author.name,
    );
    const version = saved.idea?.versions[0];
    if (!version) throw new Error("draft version was not created");
    const editedAgain = saveIdeaNotesInState(
      saved.state,
      draft.id,
      draft.notes.map((note) => ({ ...note, text: "Manual drift" })),
      author.name,
    );
    const restored = restoreDraftVersionInState(
      editedAgain.state,
      draft.id,
      version.id,
      author.name,
    );

    expect(restored.idea?.notes).toEqual(version.notes);
    expect(restored.idea?.methodology).toBe(version.fields.methodology);
    expect(restored.idea?.versions.at(-1)?.trigger).toBe("manual_restore");
  });
});

describe("idea store readiness", () => {
  it("seeds marketplace with real catalog open ideas", () => {
    const state = initialIdeaStoreState();
    const ownerNames = state.ideas.map((idea) => idea.ownerName).sort();

    expect(ownerNames).toEqual(["Hyanghee Park", "Yiren Liu", "Yun Huang"]);

    for (const idea of state.ideas) {
      const author = getRequiredAuthor(idea.ownerName);
      expect(idea.status).toBe("open");
      expect(idea.comments).toEqual([]);
      expect(idea.upvotedBy).toEqual([]);
      expect(idea.versions).toHaveLength(1);
      for (const note of idea.notes) {
        expect(note.authorHandle).toBe(author.name);
        expect(note.authorUserId).toBe(author.id);
      }
    }
  });

  it("creates drafts with real owner and sticky author names", () => {
    const author = getRequiredAuthor();
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const { idea } = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    if (!idea) throw new Error("draft was not created");
    expect(idea.ownerName).toBe(author.name);
    expect(idea.status).toBe("draft");
    expect(idea.comments).toEqual([]);
    expect(idea.upvotedBy).toEqual([]);
    for (const note of idea.notes) {
      expect(note.authorHandle).toBe(author.name);
      expect(note.authorUserId).toBe(author.id);
    }
  });

  it("saves generated topic recommendation counts by author", () => {
    const state = initialIdeaStoreState();
    const saved = saveTopicRecommendationCountInState(state, "yun-huang", 6);

    expect(saved.idea).toBeNull();
    expect(saved.state.topicRecommendationCountByAuthor["yun-huang"]).toBe(6);
    expect(initialIdeaStoreState().topicRecommendationCountByAuthor).toEqual({});
  });

  it("normalizes older stores without saved topic counts", () => {
    const state = initialIdeaStoreState();
    const { topicRecommendationCountByAuthor: _topicCounts, ...legacyState } = state;

    const normalized = normalizeIdeaStoreState(legacyState as typeof state);

    expect(normalized.topicRecommendationCountByAuthor).toEqual({});
  });

  it("reuses an existing idea instead of duplicating the same generated card", () => {
    const author = getRequiredAuthor("Yun Huang");
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const created = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    const draft = created.idea;
    if (!draft) throw new Error("draft was not created");
    const fields: IdeaFields = {
      title: draft.title,
      hypothesis: draft.hypothesis,
      methodology: draft.methodology,
      novelty: draft.novelty,
      citations: draft.citations,
    };
    const published = publishIdeaInState(created.state, draft.id, fields, author.name);
    const openIdea = published.idea;
    if (!openIdea) throw new Error("idea was not published");

    const recreated = createIdeaFromCardInState(published.state, ideaCard, author.name);

    expect(recreated.idea?.id).toBe(openIdea.id);
    expect(recreated.state.ideas).toHaveLength(published.state.ideas.length);
  });

  it("deletes only ideas owned by the actor", () => {
    const author = getRequiredAuthor("Yun Huang");
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const created = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    const draft = created.idea;
    if (!draft) throw new Error("draft was not created");

    const nonOwnerAttempt = deleteIdeaInState(created.state, draft.id, "Yiren Liu");
    expect(nonOwnerAttempt.idea).toBeNull();
    expect(nonOwnerAttempt.state.ideas.some((idea) => idea.id === draft.id)).toBe(true);

    const ownerAttempt = deleteIdeaInState(created.state, draft.id, author.name);
    expect(ownerAttempt.idea?.id).toBe(draft.id);
    expect(ownerAttempt.state.ideas.some((idea) => idea.id === draft.id)).toBe(false);
  });

  it("returns one visible dashboard idea for duplicated owner and card pairs", () => {
    const author = getRequiredAuthor("Yun Huang");
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const created = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    const draft = created.idea;
    if (!draft) throw new Error("draft was not created");
    const duplicate = {
      ...draft,
      id: "duplicate-dashboard-idea",
      updatedAt: "2000-01-01T00:00:00.000Z",
    };
    const stateWithDuplicate = {
      ...created.state,
      ideas: [duplicate, ...created.state.ideas],
    };

    const visibleIdeas = getIdeasForAuthorFromState(stateWithDuplicate, author.name);

    expect(visibleIdeas.filter((idea) => idea.cardId === ideaCard.id)).toHaveLength(1);
    expect(visibleIdeas.find((idea) => idea.cardId === ideaCard.id)?.id).toBe(draft.id);
  });

  it("rejects non-owner draft note and publish mutations", () => {
    const author = getRequiredAuthor("Yun Huang");
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const created = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    const idea = created.idea;
    if (!idea) throw new Error("draft was not created");
    const editedNotes = idea.notes.map((note) => ({ ...note, text: "Non-owner edit" }));
    const fields: IdeaFields = {
      title: idea.title,
      hypothesis: idea.hypothesis,
      methodology: idea.methodology,
      novelty: idea.novelty,
      citations: idea.citations,
    };

    const noteAttempt = saveIdeaNotesInState(created.state, idea.id, editedNotes, "Yiren Liu");
    expect(noteAttempt.idea).toBeNull();
    expect(noteAttempt.state.ideas.find((candidate) => candidate.id === idea.id)?.notes).toEqual(
      idea.notes,
    );

    const publishAttempt = publishIdeaInState(noteAttempt.state, idea.id, fields, "Yiren Liu");
    expect(publishAttempt.idea).toBeNull();
    expect(publishAttempt.state.ideas.find((candidate) => candidate.id === idea.id)?.status).toBe(
      "draft",
    );
  });

  it("allows marketplace authors to comment on open ideas", () => {
    const author = getRequiredAuthor("Yun Huang");
    const ideaCard = generateIdeaCards([], author.name)[0];
    if (!ideaCard) throw new Error("no idea generated");
    const created = createIdeaFromCardInState(initialIdeaStoreState(), ideaCard, author.name);
    const draft = created.idea;
    if (!draft) throw new Error("draft was not created");
    const fields: IdeaFields = {
      title: draft.title,
      hypothesis: draft.hypothesis,
      methodology: draft.methodology,
      novelty: draft.novelty,
      citations: draft.citations,
    };
    const published = publishIdeaInState(created.state, draft.id, fields, author.name);
    if (!published.idea) throw new Error("idea was not published");
    const commented = addCommentToIdeaInState(published.state, {
      ideaId: draft.id,
      authorName: "Yiren Liu",
      type: "general",
      body: "Useful critique",
    });
    const comment = commented.idea?.comments[0];
    if (!comment) throw new Error("comment was not created");

    expect(comment.authorName).toBe("Yiren Liu");
    expect(comment.body).toBe("Useful critique");
    expect(comment.reactions).toEqual({
      "👍": [],
      "👎": [],
      "🎯": [],
      "💡": [],
      "⚠️": [],
      "❓": [],
    });
  });

  it("keeps retired locked ideas private without report data", () => {
    const state = initialIdeaStoreState();
    const source = state.ideas[0];
    if (!source) throw new Error("seed idea is missing");
    const retiredIdea = {
      ...source,
      status: "locked" as const,
      lockedAt: "2026-05-05T00:00:00.000Z",
      lockReport: {
        absorbedComments: 0,
        uniqueContributors: 0,
        leadingTypes: [],
        suggestedAcknowledgments: "Legacy report",
      },
    };
    const normalized = normalizeIdeaStoreState({ ...state, ideas: [retiredIdea] });
    const normalizedIdea = normalized.ideas[0];
    if (!normalizedIdea) throw new Error("normalized idea is missing");

    expect(normalizedIdea.status).toBe("locked");
    expect("lockedAt" in normalizedIdea).toBe(false);
    expect("lockReport" in normalizedIdea).toBe(false);

    const nonOwnerComment = addCommentToIdeaInState(normalized, {
      ideaId: source.id,
      authorName: "Yiren Liu",
      type: "general",
      body: "Outside comment",
    });
    expect(nonOwnerComment.idea?.comments).toHaveLength(0);

    const nonOwnerVote = toggleIdeaUpvoteInState(normalized, source.id, "Yiren Liu");
    expect(nonOwnerVote.idea?.upvotedBy).toEqual([]);

    const ownerVote = toggleIdeaUpvoteInState(normalized, source.id, source.ownerName);
    expect(ownerVote.idea?.upvotedBy).toEqual([source.ownerName]);
  });

  it("upgrades stale published synthesis to real paper grounding", () => {
    const state = initialIdeaStoreState();
    const source = state.ideas[0];
    if (!source) throw new Error("seed idea is missing");
    const paper = getPaperById(source.groundingPaperIds[0] ?? "");
    if (!paper) throw new Error("source paper is missing");
    const staleFields: IdeaFields = {
      title: "From generic to stale: a CHI-ready intervention",
      hypothesis: "If generic is inspectable, researchers move faster.",
      methodology: "Method sketch:\nPrototype a lightweight generic system.",
      novelty: ["Generic novelty", "Generic method"],
      citations: source.citations,
    };
    const staleIdea = {
      ...source,
      ...staleFields,
      notes: source.notes.map((note) =>
        note.themeIndex === null ? note : { ...note, width: 165, height: 145 },
      ),
      versions: source.versions.map((version) => ({ ...version, fields: staleFields })),
    };
    const normalized = normalizeIdeaStoreState({ ...state, ideas: [staleIdea] });
    const normalizedIdea = normalized.ideas[0];
    if (!normalizedIdea) throw new Error("normalized idea is missing");

    expect(normalizedIdea.title).toContain(paper.title);
    expect(normalizedIdea.methodology).toContain(`Abstract: ${paper.abstract.slice(0, 80)}`);
    expect(normalizedIdea.versions.at(-1)?.fields.title).toContain(paper.title);
    expect(
      normalizedIdea.notes
        .filter((note) => note.themeIndex !== null)
        .every((note) => note.width >= 300),
    ).toBe(true);
  });
});

describe("paper catalog lookup", () => {
  it("loads named CHI author records from the catalog", () => {
    const author = getRequiredAuthor();
    expect(author.name.length).toBeGreaterThan(0);
    expect(author.papers.length).toBeGreaterThan(0);
  });

  it("getPaperById round-trips a known paper", () => {
    const author = getRequiredAuthor();
    const paper = author.papers[0];
    if (!paper) return;
    expect(getPaperById(paper.id)?.title).toBe(paper.title);
  });

  it("cross-validates the target author cases", () => {
    for (const name of ["Yun Huang", "Yiren Liu", "Hyanghee Park"]) {
      const author = getRequiredAuthor(name);
      expect(author.papers.length).toBeGreaterThan(0);
    }
  });

  it("matches exact, fuzzy, and first-name CHI authors", () => {
    expect(findCHIAuthorMatches("Yun Huang")[0]?.author.name).toBe("Yun Huang");
    expect(findCHIAuthorMatches("Yiren Lio")[0]?.author.name).toBe("Yiren Liu");
    expect(findCHIAuthorMatches("Hyanghee")[0]?.author.name).toBe("Hyanghee Park");
  });

  it("returns no matches for unknown CHI authors", () => {
    expect(findCHIAuthorMatches("Not A Real CHI Author")).toHaveLength(0);
  });
});
