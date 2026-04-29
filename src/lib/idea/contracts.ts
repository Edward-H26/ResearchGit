import { z } from "zod";

export const AnchorPaperSummarySchema = z.object({
  paperId: z.string(),
  title: z.string(),
  venue: z.string().nullable(),
  year: z.number().int().nullable().optional(),
  url: z.string().nullable().optional(),
});
export type AnchorPaperSummary = z.infer<typeof AnchorPaperSummarySchema>;

export const IdeaVersionRowSchema = z.object({
  id: z.string(),
  ord: z.number().int(),
  title: z.string(),
  researchQuestion: z.string(),
  rationale: z.string(),
  proposalMarkdown: z.string(),
  source: z.enum(["llm", "ai-revise"]),
  revisionIntent: z.string().nullable(),
  changelog: z.string().nullable(),
  createdAt: z.string(),
  createdByHandle: z.string().nullable(),
});
export type IdeaVersionRow = z.infer<typeof IdeaVersionRowSchema>;

export const IdeaWithVersionsSchema = z.object({
  ideaId: z.string(),
  clusterId: z.number().int(),
  themeLabel: z.string(),
  versions: z.array(IdeaVersionRowSchema),
  anchorPapers: z.array(AnchorPaperSummarySchema),
});
export type IdeaWithVersions = z.infer<typeof IdeaWithVersionsSchema>;
