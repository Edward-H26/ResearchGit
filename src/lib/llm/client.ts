import { env } from "@/env";
import type { CatalogPaper, ClusterDetails, ClusterTheme } from "@/lib/catalog";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { buildGeneratePrompt, buildRevisePrompt } from "./prompts";
import {
  type IdeaProposal,
  IdeaProposalSchema,
  type RevisedIdea,
  RevisedIdeaSchema,
} from "./schema";

let clientInstance: OpenAI | null = null;

function assertLlmConfig(): void {
  if (
    !env.OPENAI_API_KEY ||
    env.OPENAI_API_KEY === "placeholder-openai-key" ||
    !env.OPENAI_MODEL ||
    env.OPENAI_MODEL === "placeholder-openai-model"
  ) {
    throw new Error(
      "OpenAI is not configured. Set OPENAI_API_KEY and OPENAI_MODEL before generating or revising ideas.",
    );
  }
}

function getClient(): OpenAI {
  assertLlmConfig();
  if (!clientInstance) {
    clientInstance = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return clientInstance;
}

export async function generateIdeaForCluster(input: {
  cluster: ClusterDetails;
  theme: ClusterTheme | null;
  samplePapers: ReadonlyArray<CatalogPaper>;
  seed?: number;
}): Promise<IdeaProposal> {
  const client = getClient();
  const { system, user } = buildGeneratePrompt(input);

  const completion = await client.beta.chat.completions.parse({
    model: env.OPENAI_MODEL,
    seed: input.seed ?? input.cluster.cluster_id,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: zodResponseFormat(IdeaProposalSchema, "ideaProposal"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    const refusal = completion.choices[0]?.message.refusal ?? "(no refusal text)";
    throw new Error(`LLM produced no parsed output. Refusal: ${refusal}`);
  }

  const validIds = new Set(input.samplePapers.map((p) => p.paper_id));
  for (const id of parsed.anchorPaperIds) {
    if (!validIds.has(id)) {
      throw new Error(`LLM cited unknown paper_id "${id}" not in sampled set`);
    }
  }

  return parsed;
}

export async function reviseIdea(input: {
  currentMarkdown: string;
  stickies: ReadonlyArray<{
    text: string;
    intent: "add" | "delete" | "merge";
    authorHandle: string;
  }>;
  userIntent: string;
}): Promise<RevisedIdea> {
  const client = getClient();
  const { system, user } = buildRevisePrompt(input);

  const completion = await client.beta.chat.completions.parse({
    model: env.OPENAI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: zodResponseFormat(RevisedIdeaSchema, "revisedIdea"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("LLM produced no parsed output for revision");
  }
  return parsed;
}
