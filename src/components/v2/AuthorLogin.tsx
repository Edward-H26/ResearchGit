"use client";

import {
  type AuthorMatch,
  findCHIAuthorMatches,
  getAuthors,
  normalizeName,
} from "@/lib/papers/catalog";
import { onboardingDashboardHref } from "@/lib/routes";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type AuthorLoginProps = {
  shouldPersistMatch?: boolean;
};

function paperSummary(match: AuthorMatch): string {
  const titles = match.author.papers.slice(0, 3).map((paper) => paper.title);
  return titles.join(" - ");
}

function findLiveAuthorMatches(rawName: string): AuthorMatch[] {
  const normalizedName = normalizeName(rawName);
  if (normalizedName.length < 2) return [];

  const exactAndFuzzyMatches = findCHIAuthorMatches(rawName);
  const exactMatches = exactAndFuzzyMatches.filter((match) => match.kind === "exact");
  const fuzzyMatches = exactAndFuzzyMatches.filter((match) => match.kind !== "exact");
  const seen = new Set(exactMatches.map((match) => match.author.normalizedName));
  const prefixMatches = getAuthors()
    .filter((author) => {
      if (seen.has(author.normalizedName)) return false;
      const tokens = author.normalizedName.split(" ");
      return (
        author.normalizedName.includes(normalizedName) ||
        tokens.some((token) => token.startsWith(normalizedName))
      );
    })
    .map((author) => ({ author, kind: "token" as const, distance: 0 }));

  const allMatches = [...exactMatches, ...prefixMatches, ...fuzzyMatches];
  const uniqueMatches = new Map<string, AuthorMatch>();
  for (const match of allMatches) {
    if (!uniqueMatches.has(match.author.normalizedName)) {
      uniqueMatches.set(match.author.normalizedName, match);
    }
  }
  return [...uniqueMatches.values()].slice(0, 5);
}

export function AuthorLogin({ shouldPersistMatch = false }: AuthorLoginProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<AuthorMatch[] | null>(null);
  const [hardBlocked, setHardBlocked] = useState(false);
  const [pendingAuthorName, setPendingAuthorName] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const exactMatch = matches?.length === 1 && matches[0]?.kind === "exact" ? matches[0] : null;
  const needsDisambiguation = matches !== null && !exactMatch && matches.length > 0;
  const noMatches = matches !== null && matches.length === 0;
  const liveMatches = useMemo(() => {
    return findLiveAuthorMatches(name);
  }, [name]);
  const showLiveMatches = matches === null && !hardBlocked && liveMatches.length > 0;

  function updateName(value: string) {
    setName(value);
    setMatches(null);
    setHardBlocked(false);
    setLinkError(null);
  }

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = findCHIAuthorMatches(name);
    setMatches(result);
    setHardBlocked(false);
  }

  async function continueAs(match: AuthorMatch) {
    if (shouldPersistMatch) {
      setPendingAuthorName(match.author.name);
      setLinkError(null);

      try {
        const response = await fetch("/api/authors/match", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ authorName: match.author.name }),
        });

        if (!response.ok) {
          setLinkError("Could not link this CHI author to your account. Try again.");
          setPendingAuthorName(null);
          return;
        }
      } catch {
        setLinkError("Could not link this CHI author to your account. Try again.");
        setPendingAuthorName(null);
        return;
      }
    }

    const onboardingKey = `${match.author.id}-${Date.now().toString(36)}`;
    router.push(onboardingDashboardHref(match.author.name, onboardingKey));
  }

  function selectLiveMatch(match: AuthorMatch) {
    setName(match.author.name);
    setMatches([{ author: match.author, kind: "exact", distance: 0 }]);
    setHardBlocked(false);
    setLinkError(null);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4efe7_0%,#fbfaf6_58%,#ffffff_100%)] px-5 py-8 text-neutral-950 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="min-w-0">
          <p className="font-mono-tiny uppercase tracking-[0.22em] text-[--color-muted]">
            ResearchGit V2
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-[--color-ink] sm:text-6xl">
            Sign in as a CHI 2026 author.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[--color-muted]">
            Match your author name to the CHI 2026 program, confirm the paper record, then continue
            into recommendations, drafting, marketplace feedback, and saved versions.
          </p>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(57,44,18,0.08)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Author lookup
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Enter your name</h2>
            </div>
            <span className="rounded-full bg-[#f4e6c5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f5210]">
              Required
            </span>
          </div>

          <form onSubmit={submitName} className="mt-6">
            <label className="min-w-0 flex-1">
              <span className="sr-only">CHI 2026 author name</span>
              <input
                value={name}
                onChange={(event) => updateName(event.target.value)}
                placeholder="Enter your CHI 2026 name"
                className="w-full rounded-2xl border border-neutral-200 bg-[#fcfbf8] px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
              />
            </label>
          </form>

          {showLiveMatches ? (
            <div className="mt-3 rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-3">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Possible matches
              </p>
              <div className="mt-2 grid gap-2">
                {liveMatches.map((match) => (
                  <button
                    key={match.author.id}
                    type="button"
                    data-author-suggestion="true"
                    onClick={() => selectLiveMatch(match)}
                    className="rounded-[18px] bg-white px-4 py-3 text-left transition hover:bg-[#f7f4ed] focus:outline-none focus:ring-2 focus:ring-neutral-950/30"
                  >
                    <span className="block text-sm font-semibold">{match.author.name}</span>
                    <span className="mt-1 block text-xs text-neutral-500">
                      {match.kind} match, {match.author.papers.length} paper(s),{" "}
                      {match.author.affiliation}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {linkError ? (
            <p className="mt-3 rounded-2xl border border-[#f0c6b8] bg-[#fff2ee] px-4 py-3 text-sm text-[#8c3f25]">
              {linkError}
            </p>
          ) : null}

          {exactMatch ? (
            <div className="mt-6 rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Confirm match
              </p>
              <h3 className="mt-2 text-2xl font-semibold">{exactMatch.author.name}</h3>
              <p className="mt-1 text-sm text-neutral-500">{exactMatch.author.affiliation}</p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {exactMatch.author.papers.length} paper(s). {paperSummary(exactMatch)}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => continueAs(exactMatch)}
                  disabled={pendingAuthorName === exactMatch.author.name}
                  className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  {pendingAuthorName === exactMatch.author.name ? "Linking..." : "Yes, continue"}
                </button>
                <button
                  type="button"
                  onClick={() => setMatches(null)}
                  className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
                >
                  No, retry
                </button>
              </div>
            </div>
          ) : null}

          {needsDisambiguation ? (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Select the right author
              </p>
              <div className="mt-3 grid gap-3">
                {matches.map((match) => (
                  <article
                    key={match.author.id}
                    className="rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold">{match.author.name}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                          {match.kind} match - {match.author.papers.length} paper(s)
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                          {paperSummary(match)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => continueAs(match)}
                        disabled={pendingAuthorName === match.author.name}
                        className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                      >
                        {pendingAuthorName === match.author.name ? "Linking..." : "Select"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setHardBlocked(true)}
                className="mt-4 text-sm font-semibold text-neutral-700 underline underline-offset-4"
              >
                None of these
              </button>
            </div>
          ) : null}

          {noMatches || hardBlocked ? (
            <div className="mt-6 rounded-[24px] border border-[#f0c6b8] bg-[#fff2ee] p-5 text-[#8c3f25]">
              <h3 className="text-lg font-semibold">No CHI 2026 author paper is linked.</h3>
              <p className="mt-2 text-sm leading-relaxed">
                Try another spelling or contact an administrator to link your account before using
                dashboard, ideas, or marketplace routes.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMatches(null);
                    setHardBlocked(false);
                  }}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#8c3f25] transition hover:bg-[#ffe7df]"
                >
                  Try again
                </button>
                <a
                  href="mailto:admin@researchgit.local"
                  className="rounded-full border border-[#e5ad9a] px-4 py-2 text-sm font-semibold transition hover:bg-[#ffe7df]"
                >
                  Contact admin
                </a>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
