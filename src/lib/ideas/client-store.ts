"use client";

import type { StickyNote } from "@/lib/canvas";
import type { IdeaCard } from "@/lib/ideas";
import {
  dedupeIdeasByOwnerAndCard,
  getAllIdeasFromState,
  getIdeaByIdFromState,
  getIdeasForAuthorFromState,
} from "@/lib/ideas/store";
import type {
  CommentType,
  IdeaFields,
  IdeaMutationResult,
  IdeaRecord,
  IdeaStoreState,
  IdeaVersionTrigger,
  ReactionKind,
} from "@/lib/ideas/store-types";

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
const STORE_UPDATED_STORAGE_KEY = "researchgit:idea-store-updated-at";
const STORE_UPDATED_CHANNEL = "researchgit:idea-store";
const POLL_INTERVAL_MS = 600;

type StoreListener = () => void | Promise<void>;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(STORE_UPDATED_CHANNEL);
}

function emitStoreUpdated() {
  const updatedAt = Date.now().toString();
  window.dispatchEvent(new Event(STORE_UPDATED_EVENT));
  window.localStorage.setItem(STORE_UPDATED_STORAGE_KEY, updatedAt);
  const channel = getBroadcastChannel();
  channel?.postMessage({ type: STORE_UPDATED_EVENT, updatedAt });
  channel?.close();
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

function ideaStoreReadPath(): string {
  if (typeof window === "undefined") return "/api/ideas/store";
  const authorName = new URLSearchParams(window.location.search).get("author");
  if (!authorName) return "/api/ideas/store";
  const params = new URLSearchParams({ author: authorName });
  return `/api/ideas/store?${params.toString()}`;
}

export async function loadIdeaStoreState(): Promise<IdeaStoreState> {
  const response = await fetch(ideaStoreReadPath(), { cache: "no-store" });
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

export async function createTopicIdeaFromCard(
  card: IdeaCard,
  actorName: string,
): Promise<IdeaRecord | null> {
  return (await postIdeaAction("createTopicIdeaFromCard", { card, actorName })).idea;
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
  let queued = false;
  const channel = getBroadcastChannel();
  const notify = () => {
    if (queued) return;
    queued = true;
    window.setTimeout(() => {
      queued = false;
      void listener();
    }, 50);
  };
  const notifyFromStorage = (event: StorageEvent) => {
    if (event.key === STORE_UPDATED_STORAGE_KEY) notify();
  };
  const notifyFromVisibility = () => {
    if (document.visibilityState === "visible") notify();
  };
  const notifyFromChannel = (event: MessageEvent) => {
    if ((event.data as { type?: string }).type === STORE_UPDATED_EVENT) notify();
  };

  window.addEventListener(STORE_UPDATED_EVENT, notify);
  window.addEventListener("storage", notifyFromStorage);
  window.addEventListener("focus", notify);
  document.addEventListener("visibilitychange", notifyFromVisibility);
  channel?.addEventListener("message", notifyFromChannel);
  const intervalId = window.setInterval(notify, POLL_INTERVAL_MS);

  return () => {
    window.removeEventListener(STORE_UPDATED_EVENT, notify);
    window.removeEventListener("storage", notifyFromStorage);
    window.removeEventListener("focus", notify);
    document.removeEventListener("visibilitychange", notifyFromVisibility);
    channel?.removeEventListener("message", notifyFromChannel);
    channel?.close();
    window.clearInterval(intervalId);
  };
}
