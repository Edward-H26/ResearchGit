import { auth } from "@/lib/auth";
import { getAuthorByName } from "@/lib/papers/catalog";
import { setMatchedAuthorName } from "@/server/user-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const MatchAuthorRequestSchema = z.object({
  authorName: z.string().min(1),
});

export async function POST(req: Request) {
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

  const parsed = MatchAuthorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const author = getAuthorByName(parsed.data.authorName);
  if (!author) {
    return NextResponse.json({ error: "unknown_author" }, { status: 404 });
  }

  const result = await setMatchedAuthorName(session.user.id, author.name, author.affiliation);
  return NextResponse.json({
    matchedAuthorName: result.matchedAuthorName,
  });
}
