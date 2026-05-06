import { env } from "@/env";
import OpenAI from "openai";

let clientInstance: OpenAI | null = null;

function assertLlmConfig(): void {
  if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) {
    throw new Error(
      "OpenAI is not configured. Set OPENAI_API_KEY and OPENAI_MODEL before calling the LLM.",
    );
  }
}

export function getOpenAIClient(): OpenAI {
  assertLlmConfig();
  if (!clientInstance) {
    clientInstance = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return clientInstance;
}
