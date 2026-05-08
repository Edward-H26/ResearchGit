import { auth } from "@/lib/auth";
import { resolveActionAuthorName } from "@/lib/auth/author";
import { getVisibleIdeaStoreState } from "@/lib/ideas/store";
import {
  type IdeaStoreAction,
  IdeaStoreActionSchema,
  applyIdeaStoreAction,
} from "@/lib/ideas/store-actions";
import { getIdeaStoreState, mutateIdeaStoreState } from "@/server/idea-store-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function objectPayload(payload: unknown): Record<string, unknown> {
  return typeof payload === "object" && payload !== null
    ? (payload as Record<string, unknown>)
    : {};
}

function requestedActionAuthorName(action: IdeaStoreAction): string | null {
  const payload = objectPayload(action.payload);
  switch (action.action) {
    case "createIdeaFromCard":
    case "addCommentToIdea":
    case "toggleIdeaUpvote":
    case "toggleCommentReaction":
      return typeof payload.authorName === "string" ? payload.authorName : null;
    case "createTopicIdeaFromCard":
    case "deleteIdea":
    case "deleteCommentFromIdea":
    case "saveIdeaNotes":
    case "publishIdea":
    case "saveDraftVersion":
    case "restoreDraftVersion":
      return typeof payload.actorName === "string" ? payload.actorName : null;
    case "completeOnboarding":
    case "saveTopicRecommendationCount":
    case "clearJoinedTopics":
      return typeof payload.normalizedAuthorName === "string" ? payload.normalizedAuthorName : null;
    default:
      return null;
  }
}

export async function GET(req: Request) {
  const session = await auth();
  const params = new URL(req.url).searchParams;
  const viewerName = resolveActionAuthorName(session, params.get("author"));
  return NextResponse.json(getVisibleIdeaStoreState(await getIdeaStoreState(), viewerName));
}

export async function POST(req: Request) {
  const session = await auth();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = IdeaStoreActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const authorName = resolveActionAuthorName(session, requestedActionAuthorName(parsed.data));
  if (!authorName) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await mutateIdeaStoreState((state) =>
    applyIdeaStoreAction(state, parsed.data, authorName),
  );

  return NextResponse.json(result);
}
