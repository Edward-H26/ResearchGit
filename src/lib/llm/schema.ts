import { z } from "zod";

export const GeneratedIdeaSchema = z.object({
  title: z.string().min(1).max(160),
  hypothesis: z.string().min(1).max(240),
  methodSketch: z.string().min(1),
  novelty: z.array(z.string().min(1)).min(2).max(3),
  groundingCitations: z.array(z.string().min(1)).min(1),
});

export const GeneratedIdeasSchema = z.object({
  ideas: z.array(GeneratedIdeaSchema).min(2).max(3),
});

export const ThemeClusterSchema = z.object({
  label: z.string().min(1).max(60),
  noteIndexes: z.array(z.number().int().nonnegative()).min(1),
});

export const ThemeClustersSchema = z.object({
  themes: z.array(ThemeClusterSchema).min(1).max(3),
});

export const SynthesizedIdeaSchema = z.object({
  title: z.string().min(1).max(160),
  hypothesis: z.string().min(1).max(240),
  methodology: z.string().min(1),
  novelty: z.array(z.string().min(1)).min(2).max(4),
  citations: z.array(z.string().min(1)).min(1),
});
