import "server-only";

import { env } from "@/env";
import {
  type StickyNoteEnhancementInput,
  buildStickyNoteEnhancementPrompt,
} from "@/lib/canvas/ai-enhance";
import { getOpenAIClient } from "@/lib/llm/client";

export function cleanStickyNoteEnhancementText(value: string): string | null {
  const cleaned = value
    .trim()
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return cleaned ? cleaned.slice(0, 1200) : null;
}

export async function generateStickyNoteEnhancement(
  input: StickyNoteEnhancementInput,
): Promise<string | null> {
  const client = getOpenAIClient();
  const prompt = buildStickyNoteEnhancementPrompt(input);
  const response = await client.responses.create({
    model: env.OPENAI_MODEL ?? "",
    input: prompt,
  });
  return cleanStickyNoteEnhancementText(response.output_text);
}
