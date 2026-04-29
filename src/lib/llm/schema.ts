import { z } from "zod";

export const IdeaProposalSchema = z.object({
  title: z.string().min(8).max(100),
  researchQuestion: z.string().min(20).max(220),
  rationale: z.string().min(40).max(400),
  proposalMarkdown: z.string().min(800).max(2000),
  anchorPaperIds: z
    .array(z.string().min(1))
    .length(3)
    .refine((arr) => new Set(arr).size === 3, "anchorPaperIds must be 3 distinct ids"),
});

export type IdeaProposal = z.infer<typeof IdeaProposalSchema>;

export const RevisedIdeaSchema = z.object({
  revisedMarkdown: z.string().min(1),
  changelog: z.string().min(1).max(300),
});

export type RevisedIdea = z.infer<typeof RevisedIdeaSchema>;
