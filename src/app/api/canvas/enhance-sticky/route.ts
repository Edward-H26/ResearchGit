import { auth } from "@/lib/auth";
import { resolveActionAuthorName } from "@/lib/auth/author";
import { STICKY_NOTE_ENHANCEMENT_OPTIONS } from "@/lib/canvas/ai-enhance";
import { generateStickyNoteEnhancement } from "@/lib/canvas/ai-enhance-server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const StickyNoteEnhancementOptionIdSchema = z.enum(
  STICKY_NOTE_ENHANCEMENT_OPTIONS.map((option) => option.id) as [
    (typeof STICKY_NOTE_ENHANCEMENT_OPTIONS)[number]["id"],
    ...(typeof STICKY_NOTE_ENHANCEMENT_OPTIONS)[number]["id"][],
  ],
);

function boundedString(maxLength: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : value,
    z.string().max(maxLength),
  );
}

function optionalBoundedString(maxLength: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : value,
    z.string().max(maxLength).optional(),
  );
}

function optionalBoundedStringList(limit: number, maxLength: number) {
  return z.preprocess(
    (value) =>
      Array.isArray(value)
        ? value
            .filter((item) => typeof item === "string")
            .map((item) => item.trim().replace(/\s+/g, " ").slice(0, maxLength))
            .filter(Boolean)
            .slice(0, limit)
        : value,
    z.array(z.string().max(maxLength)).max(limit).optional(),
  );
}

const StickyNoteEnhancementRequestSchema = z.object({
  actorName: z.string().min(1),
  noteText: boundedString(4000),
  optionId: StickyNoteEnhancementOptionIdSchema,
  context: z.object({
    boardTitle: boundedString(200).pipe(z.string().min(1)),
    boardSubtitle: optionalBoundedString(240),
    topicLabel: optionalBoundedString(200),
    activePaperTitle: optionalBoundedString(300),
    relatedPaperTitles: optionalBoundedStringList(8, 300),
    sourceSummary: optionalBoundedString(2500),
    themeLabels: optionalBoundedStringList(8, 120),
    otherNotes: optionalBoundedStringList(8, 600),
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = StickyNoteEnhancementRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const actorName = resolveActionAuthorName(session, parsed.data.actorName);
  if (!actorName) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const text = await generateStickyNoteEnhancement(parsed.data);
    if (!text) {
      return NextResponse.json({ error: "empty_ai_response" }, { status: 502 });
    }
    return NextResponse.json({ text, actorName });
  } catch {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }
}
