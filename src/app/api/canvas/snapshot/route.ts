import { env } from "@/env";
import { auth } from "@/lib/auth";
import { StickyNoteSchema } from "@/lib/canvas/schema";
import { writeCanvasSnapshot } from "@/server/canvas-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  ideaId: z.string().min(1).max(128),
  notes: z.array(StickyNoteSchema).max(500),
});

function isAllowedOrigin(originHeader: string | null): boolean {
  if (!originHeader) return false;
  try {
    return new URL(originHeader).host === new URL(env.AUTH_URL).host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req.headers.get("origin"))) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await writeCanvasSnapshot({
    ideaId: parsed.data.ideaId,
    userId: session.user.id,
    notes: parsed.data.notes,
  });

  return NextResponse.json({ ok: true, ...result });
}
