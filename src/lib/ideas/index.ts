import { type StickyNote, buildStickyNote } from "@/lib/canvas";
import type { ThemeColorToken } from "@/lib/canvas/theme-styles";
import { type CatalogPaper, getPaperById } from "@/lib/papers/catalog";
import { type CatalogTopic, recommendPapersForAuthor } from "@/lib/recommendation";

export type IdeaCard = {
  id: string;
  title: string;
  hypothesis: string;
  methodSketch: string;
  novelty: string[];
  groundingPaperIds: string[];
};

export const TOPIC_IDEA_CARD_PREFIX = "topic-";
export const TOPIC_PAPER_CARD_SEPARATOR = "--paper-";

export type TopicIdeaCardScope =
  | { kind: "topic"; topicId: string; paperId: null }
  | { kind: "paper"; topicId: string; paperId: string };

export type ThemeCluster = {
  index: number;
  label: string;
  compactLabel: string;
  colorToken: ThemeColorToken;
  noteIds: string[];
};

export type DraftEnhancementTrigger = "ai_quick_action" | "ai_custom_prompt";

export type DraftEnhancementPreview = {
  fields: {
    title: string;
    hypothesis: string;
    methodology: string;
    novelty: string[];
    citations: string[];
  };
  notes: StickyNote[];
  summary: string;
};

type DraftEnhancementIdea = {
  id: string;
  cardId: string;
  ownerName: string;
  title: string;
  hypothesis: string;
  methodology: string;
  novelty: string[];
  citations: string[];
  groundingPaperIds: string[];
};

export type ThemeClusterDefinition = Omit<ThemeCluster, "noteIds">;

export const THEME_CLUSTER_DEFINITIONS: ReadonlyArray<ThemeClusterDefinition> = [
  {
    index: 0,
    label: "Hypothesis and problem rationale",
    compactLabel: "Hypothesis",
    colorToken: "u-rose",
  },
  {
    index: 1,
    label: "Study method and evaluation plan",
    compactLabel: "Study plan",
    colorToken: "u-amber",
  },
  {
    index: 2,
    label: "Novelty and CHI contribution positioning",
    compactLabel: "Novelty",
    colorToken: "u-citron",
  },
];

export const UNGROUPED_THEME_INDEX = 3;
export const UNGROUPED_THEME_DEFINITION: ThemeClusterDefinition = {
  index: UNGROUPED_THEME_INDEX,
  label: "Ungrouped notes",
  compactLabel: "Ungrouped",
  colorToken: "u-sky",
};

export const THEME_DISPLAY_DEFINITIONS: ReadonlyArray<ThemeClusterDefinition> = [
  ...THEME_CLUSTER_DEFINITIONS,
  UNGROUPED_THEME_DEFINITION,
];

const THEME_ASSIGNMENT_RULES: ReadonlyArray<{
  index: number;
  keywords: ReadonlyArray<string>;
}> = [
  {
    index: 0,
    keywords: ["core hypothesis", "hypothesis", "problem", "rationale", "if ", "inspectable"],
  },
  {
    index: 1,
    keywords: [
      "method sketch",
      "method",
      "prototype",
      "study",
      "evaluate",
      "experiment",
      "comparative",
    ],
  },
  {
    index: 2,
    keywords: ["novelty", "contribution", "reframes", "connects", "author workflows", "deployable"],
  },
];

const THEME_GROUP_LAYOUTS = [
  { x: 90, y: 330 },
  { x: 430, y: 330 },
  { x: 770, y: 330 },
  { x: 1110, y: 330 },
] as const;

const THEME_GROUP_NOTE_GAP = 360;
const THEMED_NOTE_MIN_WIDTH = 300;
const THEMED_NOTE_MIN_HEIGHT = 190;
const THEMED_NOTE_LINE_HEIGHT = 22;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function compactText(value: string, fallback: string): string {
  const compacted = value.trim().replace(/\s+/g, " ");
  return compacted.length > 0 ? compacted : fallback;
}

function keywordsForPaper(paper: CatalogPaper): string[] {
  return dedupe(
    `${paper.title} ${paper.abstract}`
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 5),
  ).slice(0, 8);
}

export function generateIdeaCards(selectedPaperIds: string[], authorName: string): IdeaCard[] {
  const selectedPapers = selectedPaperIds
    .map((paperId) => getPaperById(paperId))
    .filter((paper): paper is CatalogPaper => paper !== null);

  const basis =
    selectedPapers.length > 0
      ? selectedPapers
      : recommendPapersForAuthor(authorName, 3).map((recommendation) => recommendation.paper);

  return basis.slice(0, 3).map((paper, index) => {
    const keywords = keywordsForPaper(paper);
    const keywordA = keywords[0] ?? "research";
    const keywordB = keywords[1] ?? "collaboration";

    return {
      id: `${slugify(paper.title)}-${index + 1}`,
      title: `${paper.title}: ResearchGit extension for ${paper.sessionRoom}`,
      hypothesis: `If the CHI problem in "${paper.title}" is made inspectable as an author workflow, researchers can extend the paper without losing its empirical grounding.`,
      methodSketch: `Source paper: ${paper.title}\nSession: ${paper.sessionRoom}\nPrototype a lightweight system grounded in the paper's ${keywordA} and ${keywordB} contribution. Run a comparative study with CHI authors, then evaluate planning quality, critique quality, and confidence.`,
      novelty: [
        `Extends the real CHI paper "${paper.title}" into an inspectable author workflow rather than a generic idea prompt.`,
        `Connects the paper's ${keywordA} and ${keywordB} contribution to concrete design and evaluation decisions from ${paper.sessionRoom}.`,
        "Produces a deployable ResearchGit method grounded in the selected paper record.",
      ],
      groundingPaperIds: [paper.id],
    };
  });
}

export function buildTopicIdeaCard(topic: CatalogTopic): IdeaCard {
  const paperCount = topic.papers.length;
  const topicKeywords = topic.keywordProfile.slice(0, 3);
  const keywordText =
    topicKeywords.length > 0 ? topicKeywords.join(", ") : "shared CHI 2026 questions";
  return {
    id: `${TOPIC_IDEA_CARD_PREFIX}${topic.id}`,
    title: `${topic.label}: shared CHI 2026 topic canvas`,
    hypothesis: `If researchers work from the same CHI 2026 topic group, "${topic.label}", they can surface convergent directions, tensions, and proposal opportunities across ${paperCount} paper(s).`,
    methodSketch: `Topic source: ${topic.source}\nShared anchor: ${paperCount} CHI 2026 paper(s)\nTopic signals: ${keywordText}\nUse the canvas to collect asynchronous sticky notes, then synthesize directions and next steps from the accumulated discussion.`,
    novelty: [
      `Turns the CHI 2026 topic group "${topic.label}" into a shared public workspace rather than a single-paper draft.`,
      `Keeps discussion grounded in ${paperCount} same-topic paper record(s) from src/data/papers_by_room.json.`,
      "Supports community-level synthesis from sticky notes, paper anchors, and comments.",
    ],
    groundingPaperIds: topic.papers.map((paper) => paper.id),
  };
}

export function parseTopicIdeaCardId(cardId: string): TopicIdeaCardScope | null {
  if (!cardId.startsWith(TOPIC_IDEA_CARD_PREFIX)) return null;
  const scopedId = cardId.slice(TOPIC_IDEA_CARD_PREFIX.length);
  const separatorIndex = scopedId.indexOf(TOPIC_PAPER_CARD_SEPARATOR);
  if (separatorIndex < 0) {
    return scopedId ? { kind: "topic", topicId: scopedId, paperId: null } : null;
  }
  const topicId = scopedId.slice(0, separatorIndex);
  const paperId = scopedId.slice(separatorIndex + TOPIC_PAPER_CARD_SEPARATOR.length);
  if (!topicId || !paperId) return null;
  return { kind: "paper", topicId, paperId };
}

export function buildTopicPaperIdeaCard(topic: CatalogTopic, paper: CatalogPaper): IdeaCard {
  const topicKeywords = topic.keywordProfile.slice(0, 3);
  const keywordText =
    topicKeywords.length > 0 ? topicKeywords.join(", ") : "shared CHI 2026 questions";
  return {
    id: `${TOPIC_IDEA_CARD_PREFIX}${topic.id}${TOPIC_PAPER_CARD_SEPARATOR}${paper.id}`,
    title: `${paper.title}: paper canvas for ${topic.label}`,
    hypothesis: `If researchers inspect "${paper.title}" inside the broader CHI 2026 topic "${topic.label}", they can develop paper-specific directions while preserving the shared session context.`,
    methodSketch: `Paper source: ${paper.title}\nSession: ${paper.sessionRoom}\nTopic: ${topic.label}\nAbstract: ${paper.abstract}\nUse the canvas to collect sticky notes focused on this paper, then compare them against adjacent papers in the same topic group. Topic signals: ${keywordText}.`,
    novelty: [
      `Creates a dedicated collaboration canvas for "${paper.title}" instead of mixing paper-specific notes into the broader topic canvas.`,
      `Keeps the discussion anchored to ${paper.sessionRoom} while still linking it to ${topic.label}.`,
      "Supports paper-level synthesis that can later feed back into the shared topic workspace.",
    ],
    groundingPaperIds: [paper.id],
  };
}

function estimateThemedNoteHeight(text: string, width: number): number {
  const charsPerLine = Math.max(18, Math.floor((width - 32) / 9));
  const lineCount = text
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return Math.min(360, Math.max(THEMED_NOTE_MIN_HEIGHT, 66 + lineCount * THEMED_NOTE_LINE_HEIGHT));
}

export function buildDraftNotes(
  idea: IdeaCard,
  authorName: string,
  authorUserId = slugify(authorName),
): StickyNote[] {
  const prompts = [
    `Core hypothesis:\n${idea.hypothesis}`,
    `Method sketch:\n${idea.methodSketch}`,
    `Novelty 1:\n${idea.novelty[0] ?? ""}`,
    `Novelty 2:\n${idea.novelty[1] ?? ""}`,
    `Grounding:\n${idea.groundingPaperIds.join(", ")}`,
  ];

  return prompts.map((text, index) => {
    const note = buildStickyNote({
      authorHandle: authorName,
      authorUserId,
      point: { x: 280 + index * 220, y: 220 + (index % 2) * 180 },
      random: () => (index + 2) / 17,
    });
    return {
      ...note,
      id: `${idea.id}-sticky-${index + 1}`,
      text,
    };
  });
}

export function clusterNotesIntoThemes(notes: ReadonlyArray<StickyNote>): ThemeCluster[] {
  const clusters = THEME_CLUSTER_DEFINITIONS.map((definition) => ({
    ...definition,
    noteIds: [] as string[],
  }));
  const ungroupedCluster: ThemeCluster = {
    ...UNGROUPED_THEME_DEFINITION,
    noteIds: [],
  };

  for (const note of notes) {
    const text = note.text.trim().toLowerCase();
    const assignment = THEME_ASSIGNMENT_RULES.map((rule) => ({
      index: rule.index,
      score: rule.keywords.filter((keyword) => text.includes(keyword)).length,
    })).sort((a, b) => b.score - a.score)[0];
    const cluster =
      assignment && assignment.score > 0
        ? clusters.find((candidate) => candidate.index === assignment.index)
        : ungroupedCluster;
    (cluster ?? ungroupedCluster).noteIds.push(note.id);
  }

  return ungroupedCluster.noteIds.length > 0 ? [...clusters, ungroupedCluster] : clusters;
}

export function applyThemesToNotes(notes: ReadonlyArray<StickyNote>): StickyNote[] {
  const clusters = clusterNotesIntoThemes(notes);
  const clusterByNoteId = new Map(
    clusters.flatMap((cluster) =>
      cluster.noteIds.map((noteId, order) => [noteId, { cluster, order }] as const),
    ),
  );

  return notes.map((note) => {
    const assignment = clusterByNoteId.get(note.id);
    if (!assignment) return note;
    const layout = THEME_GROUP_LAYOUTS[assignment.cluster.index] ?? THEME_GROUP_LAYOUTS[0];
    const width = Math.max(note.width, THEMED_NOTE_MIN_WIDTH);
    return {
      ...note,
      x: layout.x,
      y: layout.y + assignment.order * THEME_GROUP_NOTE_GAP,
      width,
      height: estimateThemedNoteHeight(note.text, width),
      rotation: 0,
      themeIndex: assignment.cluster.index,
      themeColorToken: assignment.cluster.colorToken,
    };
  });
}

export function synthesizeIdeaFromNotes(idea: IdeaCard, notes: ReadonlyArray<StickyNote>) {
  const filledNotes = notes.filter((note) => note.text.trim().length > 0);
  const sourcePapers = idea.groundingPaperIds
    .map((paperId) => getPaperById(paperId))
    .filter((paper): paper is CatalogPaper => Boolean(paper));
  const sourceContext = sourcePapers
    .map(
      (paper) =>
        `Source paper: ${paper.title}\nSession: ${paper.sessionRoom}\nAbstract: ${paper.abstract}`,
    )
    .join("\n\n");
  const canvasContext = filledNotes.map((note) => note.text).join("\n\n");
  return {
    title: idea.title,
    hypothesis: idea.hypothesis,
    methodology: [sourceContext, canvasContext ? `Canvas synthesis:\n${canvasContext}` : ""]
      .filter(Boolean)
      .join("\n\n"),
    novelty: idea.novelty,
    citations: idea.groundingPaperIds
      .map((paperId) => getPaperById(paperId)?.title)
      .filter((title): title is string => Boolean(title)),
  };
}

export function previewDraftEnhancement(input: {
  idea: DraftEnhancementIdea;
  notes: ReadonlyArray<StickyNote>;
  intent: string;
  trigger: DraftEnhancementTrigger;
}): DraftEnhancementPreview {
  const intent = compactText(input.intent, "Strengthen the CHI contribution");
  const currentSynthesis = synthesizeIdeaFromNotes(
    {
      id: input.idea.cardId,
      title: input.idea.title,
      hypothesis: input.idea.hypothesis,
      methodSketch: input.idea.methodology,
      novelty: input.idea.novelty,
      groundingPaperIds: input.idea.groundingPaperIds,
    },
    input.notes,
  );
  const baseMethodology = compactText(
    currentSynthesis.methodology || input.idea.methodology,
    "No methodology has been drafted yet.",
  );
  const summary = `AI enhancement: ${intent}`;
  const enhancementText = [
    `AI enhancement: ${intent}`,
    "Suggested change: sharpen the draft into a more testable CHI contribution, clarify the evaluation plan, and preserve the grounding citations.",
  ].join("\n");
  const enhancementNote = buildStickyNote({
    authorHandle: input.idea.ownerName,
    authorUserId: `${slugify(input.idea.ownerName)}-ai`,
    point: {
      x: 240 + (input.notes.length % 3) * 220,
      y: 520 + Math.floor(input.notes.length / 3) * 180,
    },
    random: () => 0.5,
  });
  const notes = [
    ...input.notes,
    {
      ...enhancementNote,
      id: `${input.idea.id}-ai-enhancement-${input.notes.length + 1}`,
      text: enhancementText,
      width: 300,
      height: 220,
      rotation: 0,
    },
  ];

  return {
    fields: {
      title: currentSynthesis.title,
      hypothesis: `${compactText(currentSynthesis.hypothesis, input.idea.hypothesis)}\n\nAI enhancement focus: ${intent}`,
      methodology: `${baseMethodology}\n\nAI enhancement plan:\nFocus: ${intent}\nEvaluation: Compare the enhanced draft against the baseline idea with CHI authors, measuring planning quality, critique specificity, and confidence in next steps.\nTraceability: Keep each revision tied to the selected paper record and the accepted canvas notes.`,
      novelty: dedupe([
        ...currentSynthesis.novelty,
        `Clarifies ${intent.toLowerCase()} as an accepted AI-assisted revision with a saved version snapshot.`,
      ]).slice(0, 4),
      citations:
        currentSynthesis.citations.length > 0 ? currentSynthesis.citations : input.idea.citations,
    },
    notes,
    summary,
  };
}
