import { z } from "zod";

const StringArrayField = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}, z.array(z.string()));

export const CatalogPaperSchema = z
  .object({
    paper_id: z.string(),
    title: z.string(),
    abstract: z.string(),
    authors: StringArrayField,
    affiliations: StringArrayField.optional(),
    venue: z.string().optional(),
    venue_code: z.string().optional(),
    url: z.string().optional(),
    type: z.string().optional(),
    award: z.string().nullable().optional(),
    year: z.number().int().optional(),
  })
  .passthrough();

export type CatalogPaper = z.infer<typeof CatalogPaperSchema>;

export const ClusterDetailsSchema = z
  .object({
    cluster_id: z.number().int(),
    summary: z.string(),
    description: z.string(),
    paper_count: z.number().int(),
    papers: z.array(CatalogPaperSchema),
  })
  .passthrough();

export type ClusterDetails = z.infer<typeof ClusterDetailsSchema>;

export const ClusterThemeSchema = z
  .object({
    cluster_id: z.number().int(),
    theme_label: z.string(),
    keywords: z.array(z.string()),
    description: z.string(),
    sub_topics: z.array(z.string()),
    paper_count: z.number().int(),
    error: z.string().nullable().optional(),
  })
  .passthrough();

export type ClusterTheme = z.infer<typeof ClusterThemeSchema>;

export const AllVenuesThemesSchema = z
  .object({
    themes: z.array(ClusterThemeSchema),
  })
  .passthrough();
