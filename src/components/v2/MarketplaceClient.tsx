"use client";

import {
  type IdeaRecord,
  dedupeIdeasByOwnerAndCard,
  getAllIdeas,
  subscribeToIdeaStore,
  toggleIdeaUpvote,
} from "@/lib/ideas/client-store";
import { dashboardHref, ideaDetailHref } from "@/lib/routes";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MarketplaceClientProps = {
  viewerName: string | null;
};

type FilterMode = "all" | "open";
type SortMode = "new" | "most-up" | "most-comment";

export function MarketplaceClient({ viewerName }: MarketplaceClientProps) {
  const viewer = viewerName ?? "";
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("new");
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);

  useEffect(() => {
    let canceled = false;
    const refreshIdeas = async () => {
      const currentIdeas = await getAllIdeas();
      if (!canceled) {
        setIdeas(dedupeIdeasByOwnerAndCard(currentIdeas.filter((idea) => idea.status === "open")));
      }
    };

    void refreshIdeas();
    const unsubscribe = subscribeToIdeaStore(refreshIdeas);
    return () => {
      canceled = true;
      unsubscribe();
    };
  }, []);

  const visibleIdeas = useMemo(() => {
    const filtered = filter === "all" ? ideas : ideas.filter((idea) => idea.status === filter);
    return [...filtered].sort((a, b) => {
      if (sort === "most-up") return b.upvotedBy.length - a.upvotedBy.length;
      if (sort === "most-comment") return b.comments.length - a.comments.length;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [filter, ideas, sort]);

  async function upvote(id: string) {
    const updated = await toggleIdeaUpvote(id, viewer);
    if (!updated) return;
    setIdeas((current) => current.map((idea) => (idea.id === id ? updated : idea)));
  }

  if (!viewerName) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6 text-neutral-950">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25] shadow-[0_18px_60px_rgba(57,44,18,0.08)]">
          <h1 className="text-2xl font-semibold">Author match required</h1>
          <p className="mt-3 text-sm leading-relaxed">
            Marketplace participation requires a matched CHI 2026 author identity.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#8c3f25] transition hover:bg-[#ffe7df]"
          >
            Return to sign-in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f0e8_0%,#f8f7f2_45%,#ffffff_100%)] px-5 py-8 text-neutral-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Marketplace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Marketplace</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Browse public ideas, upvote promising directions, and open a detail page to comment.
            </p>
          </div>
          <Link
            href={viewerName ? dashboardHref(viewerName) : "/"}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Back to dashboard
          </Link>
        </div>

        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(57,44,18,0.06)]">
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {(["all", "open"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold capitalize transition sm:flex-none ${
                  filter === mode
                    ? "bg-neutral-950 text-white"
                    : "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-950"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {(
              [
                ["new", "New"],
                ["most-up", "Most upvoted"],
                ["most-comment", "Most commented"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSort(mode)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                  sort === mode
                    ? "bg-[#f4e6c5] text-[#6f5210]"
                    : "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-950"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_24px_80px_rgba(57,44,18,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Marketplace canvas
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Shared idea board</h2>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                {visibleIdeas.length} ideas
              </span>
            </div>

            <div
              data-marketplace-canvas="true"
              className="mt-4 h-[520px] overflow-auto rounded-[24px] border border-neutral-200 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.06)_1px,_transparent_1px)] bg-[size:24px_24px] sm:h-[640px]"
            >
              <div
                className="grid items-stretch gap-4 p-4"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                }}
              >
                {visibleIdeas.map((idea) => {
                  const voted = idea.upvotedBy.includes(viewer);
                  return (
                    <article
                      key={idea.id}
                      data-marketplace-sticky="true"
                      className="relative flex min-h-[216px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-black/10 bg-[#FFF7E6] p-4 shadow-xl transition hover:ring-2 hover:ring-neutral-400/70"
                    >
                      <Link
                        href={ideaDetailHref(idea.id, idea.status, viewer)}
                        aria-label={`Open ${idea.title}`}
                        className="absolute inset-0 z-0 rounded-[24px] focus:outline-none focus:ring-2 focus:ring-neutral-400/70"
                      />
                      <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden text-left">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <span className="shrink-0 rounded-full bg-[#e9f0ff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2f5ea8]">
                            {idea.status}
                          </span>
                          <span className="min-w-0 truncate text-[11px] text-neutral-600">
                            {idea.ownerName}
                          </span>
                        </div>
                        <h3
                          className="mt-3 overflow-hidden break-words text-base font-semibold leading-snug tracking-tight"
                          style={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                          }}
                        >
                          {idea.title}
                        </h3>
                        <p
                          data-marketplace-card-description="true"
                          className="mt-2 overflow-hidden break-words text-xs leading-relaxed text-neutral-600"
                          style={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 3,
                          }}
                        >
                          {idea.hypothesis}
                        </p>
                      </div>
                      <div
                        data-marketplace-card-footer="true"
                        className="pointer-events-none relative z-10 mt-3 flex shrink-0 items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void upvote(idea.id);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          className={`pointer-events-auto rounded-full px-3 py-1 text-xs font-semibold transition ${
                            voted
                              ? "bg-[#f4e6c5] text-[#6f5210]"
                              : "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-950"
                          }`}
                        >
                          {idea.upvotedBy.length} up
                        </button>
                        <span className="text-xs font-semibold text-neutral-500">
                          {idea.comments.length} notes
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {visibleIdeas.length === 0 ? (
          <section className="mt-6 rounded-[28px] border border-neutral-200 bg-white p-6 text-neutral-600">
            No ideas match the current filter.
          </section>
        ) : null}
      </div>
    </main>
  );
}
