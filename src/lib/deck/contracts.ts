import { AnchorPaperSummarySchema } from "@/lib/idea/contracts";
import { z } from "zod";

export const RegenerateResultSchema = z.object({
  deckId: z.string(),
  ideaCount: z.number().int(),
});
export type RegenerateResult = z.infer<typeof RegenerateResultSchema>;

export const ActiveDeckIdeaSchema = z.object({
  ideaId: z.string(),
  clusterId: z.number().int(),
  themeLabel: z.string(),
  latestVersion: z.object({
    title: z.string(),
    researchQuestion: z.string(),
    rationale: z.string(),
    proposalMarkdown: z.string(),
  }),
  anchorPapers: z.array(AnchorPaperSummarySchema.pick({ paperId: true, title: true, venue: true })),
});
export type ActiveDeckIdea = z.infer<typeof ActiveDeckIdeaSchema>;

export const ActiveDeckSchema = z.object({
  deckId: z.string(),
  generatedAt: z.string(),
  ideas: z.array(ActiveDeckIdeaSchema),
});
export type ActiveDeck = z.infer<typeof ActiveDeckSchema>;
