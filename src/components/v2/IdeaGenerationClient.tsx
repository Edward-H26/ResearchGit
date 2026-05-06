"use client";

import { generateIdeaCards } from "@/lib/ideas";
import { createIdeaFromCard } from "@/lib/ideas/client-store";
import { getAuthorByName, getPaperById } from "@/lib/papers/catalog";
import { dashboardHref, ideaHref } from "@/lib/routes";
import Link from "next/link";
import { useRouter } from "next/navigation";

type IdeaGenerationClientProps = {
  authorName: string | null;
  mode: string;
  selectedPaperIds: string[];
};

export function IdeaGenerationClient({
  authorName,
  mode,
  selectedPaperIds,
}: IdeaGenerationClientProps) {
  const router = useRouter();
  const author = authorName ? getAuthorByName(authorName) : null;
  const validSelectedPaperIds = selectedPaperIds.filter((paperId) => getPaperById(paperId));
  const shouldRequireSelection = mode === "selected";
  const cards =
    author && (!shouldRequireSelection || validSelectedPaperIds.length > 0)
      ? generateIdeaCards(shouldRequireSelection ? validSelectedPaperIds : [], author.name)
      : [];

  if (!author) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25]">
          <h1 className="text-2xl font-semibold">Author match required</h1>
          <p className="mt-3 text-sm leading-relaxed">
            Idea generation is available only after a CHI 2026 author match.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#8c3f25]"
          >
            Return to sign-in
          </Link>
        </section>
      </main>
    );
  }

  async function develop(cardId: string) {
    const card = cards.find((candidate) => candidate.id === cardId);
    if (!card || !author) return;
    const idea = await createIdeaFromCard(card, author.name);
    if (!idea) return;
    router.push(ideaHref(idea.id, idea.status, author.name));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ea_0%,#fffdf8_50%,#ffffff_100%)] px-5 py-8 text-neutral-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Idea generation
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Choose a card to develop
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {shouldRequireSelection
                ? `Grounded in ${validSelectedPaperIds.length} selected paper(s) for ${author.name}.`
                : `Grounded in ${author.name}'s full publication history.`}
            </p>
          </div>
          <Link
            href={dashboardHref(author.name)}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Back to dashboard
          </Link>
        </div>

        {shouldRequireSelection && validSelectedPaperIds.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25]">
            <h2 className="text-2xl font-semibold">No selected papers</h2>
            <p className="mt-3 text-sm leading-relaxed">
              Return to the dashboard and select at least one authored paper before generating from
              selected papers.
            </p>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            {cards.map((card) => (
              <article
                key={card.id}
                className="flex min-h-[24rem] flex-col rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(57,44,18,0.08)] sm:min-h-[30rem] sm:p-6"
              >
                <div className="w-fit rounded-full bg-[#f4e5d8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8c4729]">
                  Generated card
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">
                  {card.title}
                </h2>
                <p className="mt-3 text-sm italic leading-relaxed text-neutral-600">
                  {card.hypothesis}
                </p>
                <p className="mt-5 text-sm leading-relaxed text-neutral-700">{card.methodSketch}</p>
                <ul className="mt-5 space-y-2 text-sm leading-relaxed text-neutral-700">
                  {card.novelty.map((point) => (
                    <li key={point} className="rounded-2xl bg-[#faf5ef] px-4 py-3">
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  {card.groundingPaperIds.map((paperId) => (
                    <span
                      key={paperId}
                      className="max-w-full break-words rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
                    >
                      {getPaperById(paperId)?.title ?? paperId}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-6">
                  <button
                    type="button"
                    onClick={() => void develop(card.id)}
                    className="inline-flex w-full items-center justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Develop this idea
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
