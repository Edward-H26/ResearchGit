"use client";

import type { StickyNote } from "@/lib/canvas";
import type { IdeaCard } from "@/lib/ideas";
import {
  type CommentType,
  type IdeaFields,
  type IdeaMutationResult,
  type IdeaRecord,
  type IdeaStoreState,
  type IdeaVersionTrigger,
  type ReactionKind,
  dedupeIdeasByOwnerAndCard,
  getAllIdeasFromState,
  getIdeaByIdFromState,
  getIdeasForAuthorFromState,
} from "@/lib/ideas/store";

export type {
  CommentType,
  IdeaFields,
  IdeaRecord,
  IdeaStoreState,
  IdeaVersionTrigger,
  ReactionKind,
};

export { dedupeIdeasByOwnerAndCard };

const STORE_UPDATED_EVENT = "researchgit:idea-store-updated";
const POLL_INTERVAL_MS = 1500;

type StoreListener = () => void | Promise<void>;

function emitStoreUpdated() {
  window.dispatchEvent(new Event(STORE_UPDATED_EVENT));
}

async function postIdeaAction(
  action: string,
  payload: Record<string, unknown>,
): Promise<IdeaMutationResult> {
  const response = await fetch("/api/ideas/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!response.ok) throw new Error(`Idea store action failed: ${action}`);
  const result = (await response.json()) as IdeaMutationResult;
  emitStoreUpdated();
  return result;
}

export async function loadIdeaStoreState(): Promise<IdeaStoreState> {
  const response = await fetch("/api/ideas/store", { cache: "no-store" });
  if (!response.ok) throw new Error("Idea store read failed");
  return (await response.json()) as IdeaStoreState;
}

export async function getAllIdeas(): Promise<IdeaRecord[]> {
  return getAllIdeasFromState(await loadIdeaStoreState());
}

export async function getIdeasForAuthor(authorName: string): Promise<IdeaRecord[]> {
  return getIdeasForAuthorFromState(await loadIdeaStoreState(), authorName);
}

export async function getIdeaById(id: string): Promise<IdeaRecord | null> {
  return getIdeaByIdFromState(await loadIdeaStoreState(), id);
}

export async function createIdeaFromCard(
  card: IdeaCard,
  authorName: string,
): Promise<IdeaRecord | null> {
  return (await postIdeaAction("createIdeaFromCard", { card, authorName })).idea;
}

export async function deleteIdea(ideaId: string, actorName: string): Promise<IdeaRecord | null> {
  return (await postIdeaAction("deleteIdea", { ideaId, actorName })).idea;
}

export async function saveIdeaNotes(
  ideaId: string,
  notes: ReadonlyArray<StickyNote>,
  actorName?: string,
): Promise<IdeaRecord | null> {
  return (await postIdeaAction("saveIdeaNotes", { ideaId, notes: [...notes], actorName })).idea;
}

export async function publishIdea(
  ideaId: string,
  fields: IdeaFields,
  actorName?: string,
  notes?: ReadonlyArray<StickyNote>,
): Promise<IdeaRecord | null> {
  return (await postIdeaAction("publishIdea", { ideaId, fields, actorName, notes })).idea;
}

export async function saveDraftVersion(
  ideaId: string,
  fields: IdeaFields,
  notes: ReadonlyArray<StickyNote>,
  trigger: IdeaVersionTrigger,
  summary: string,
  actorName?: string,
): Promise<IdeaRecord | null> {
  return (
    await postIdeaAction("saveDraftVersion", {
      ideaId,
      fields,
      notes: [...notes],
      trigger,
      summary,
      actorName,
    })
  ).idea;
}

export async function restoreDraftVersion(
  ideaId: string,
  versionId: string,
  actorName?: string,
): Promise<IdeaRecord | null> {
  return (await postIdeaAction("restoreDraftVersion", { ideaId, versionId, actorName })).idea;
}

export async function addCommentToIdea(input: {
  ideaId: string;
  authorName: string;
  type: CommentType;
  body: string;
  parentCommentId?: string | null;
}): Promise<IdeaRecord | null> {
  return (await postIdeaAction("addCommentToIdea", { ...input })).idea;
}

export async function toggleIdeaUpvote(
  ideaId: string,
  authorName: string,
): Promise<IdeaRecord | null> {
  return (await postIdeaAction("toggleIdeaUpvote", { ideaId, authorName })).idea;
}

export async function toggleCommentReaction(
  ideaId: string,
  commentId: string,
  kind: ReactionKind,
  authorName: string,
): Promise<IdeaRecord | null> {
  return (
    await postIdeaAction("toggleCommentReaction", {
      ideaId,
      commentId,
      kind,
      authorName,
    })
  ).idea;
}

export async function completeOnboarding(normalizedAuthorName: string): Promise<IdeaStoreState> {
  return (await postIdeaAction("completeOnboarding", { normalizedAuthorName })).state;
}

export async function saveTopicRecommendationCount(
  normalizedAuthorName: string,
  visibleTopicCount: number,
): Promise<IdeaStoreState> {
  return (
    await postIdeaAction("saveTopicRecommendationCount", {
      normalizedAuthorName,
      visibleTopicCount,
    })
  ).state;
}

export function subscribeToIdeaStore(listener: StoreListener): () => void {
  const notify = () => void listener();
  window.addEventListener(STORE_UPDATED_EVENT, notify);
  const intervalId = window.setInterval(notify, POLL_INTERVAL_MS);

  return () => {
    window.removeEventListener(STORE_UPDATED_EVENT, notify);
    window.clearInterval(intervalId);
  };
}
