import type { StickyNote } from "@/lib/canvas";
import type { IdeaCard } from "@/lib/ideas";
import {
  type CommentType,
  type IdeaFields,
  type IdeaVersionTrigger,
  type ReactionKind,
  addCommentToIdeaInState,
  completeOnboardingInState,
  createIdeaFromCardInState,
  deleteIdeaInState,
  publishIdeaInState,
  restoreDraftVersionInState,
  saveDraftVersionInState,
  saveIdeaNotesInState,
  saveTopicRecommendationCountInState,
  toggleCommentReactionInState,
  toggleIdeaUpvoteInState,
} from "@/lib/ideas/store";
import { getIdeaStoreState, mutateIdeaStoreState } from "@/server/idea-store-service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ActionSchema = z.object({
  action: z.string(),
  payload: z.unknown().optional(),
});

function objectPayload(payload: unknown): Record<string, unknown> {
  return typeof payload === "object" && payload !== null
    ? (payload as Record<string, unknown>)
    : {};
}

export async function GET() {
  return NextResponse.json(await getIdeaStoreState());
}

export async function POST(req: Request) {
  const parsed = ActionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const payload = objectPayload(parsed.data.payload);
  const result = await mutateIdeaStoreState((state) => {
    switch (parsed.data.action) {
      case "createIdeaFromCard":
        return createIdeaFromCardInState(
          state,
          payload.card as IdeaCard,
          String(payload.authorName ?? ""),
        );
      case "deleteIdea":
        return deleteIdeaInState(
          state,
          String(payload.ideaId ?? ""),
          String(payload.actorName ?? ""),
        );
      case "saveIdeaNotes":
        return saveIdeaNotesInState(
          state,
          String(payload.ideaId ?? ""),
          (payload.notes ?? []) as StickyNote[],
          String(payload.actorName ?? ""),
        );
      case "publishIdea":
        return publishIdeaInState(
          state,
          String(payload.ideaId ?? ""),
          payload.fields as IdeaFields,
          String(payload.actorName ?? ""),
          (payload.notes ?? undefined) as StickyNote[] | undefined,
        );
      case "saveDraftVersion":
        return saveDraftVersionInState(
          state,
          String(payload.ideaId ?? ""),
          payload.fields as IdeaFields,
          (payload.notes ?? []) as StickyNote[],
          payload.trigger as IdeaVersionTrigger,
          String(payload.summary ?? ""),
          String(payload.actorName ?? ""),
        );
      case "restoreDraftVersion":
        return restoreDraftVersionInState(
          state,
          String(payload.ideaId ?? ""),
          String(payload.versionId ?? ""),
          String(payload.actorName ?? ""),
        );
      case "addCommentToIdea":
        return addCommentToIdeaInState(state, {
          ideaId: String(payload.ideaId ?? ""),
          authorName: String(payload.authorName ?? ""),
          type: payload.type as CommentType,
          body: String(payload.body ?? ""),
          parentCommentId: (payload.parentCommentId as string | null | undefined) ?? null,
        });
      case "toggleIdeaUpvote":
        return toggleIdeaUpvoteInState(
          state,
          String(payload.ideaId ?? ""),
          String(payload.authorName ?? ""),
        );
      case "toggleCommentReaction":
        return toggleCommentReactionInState(
          state,
          String(payload.ideaId ?? ""),
          String(payload.commentId ?? ""),
          payload.kind as ReactionKind,
          String(payload.authorName ?? ""),
        );
      case "completeOnboarding":
        return {
          state: completeOnboardingInState(state, String(payload.normalizedAuthorName ?? "")),
          idea: null,
        };
      case "saveTopicRecommendationCount":
        return saveTopicRecommendationCountInState(
          state,
          String(payload.normalizedAuthorName ?? ""),
          Number(payload.visibleTopicCount ?? 0),
        );
      default:
        return { state, idea: null };
    }
  });

  return NextResponse.json(result);
}
