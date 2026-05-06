"use client";

import {
  FIRST_ONBOARDING_STEP,
  ONBOARDING_STEPS,
  hasOnboardingShownThisSession,
  markOnboardingShownThisSession,
} from "@/components/v2/dashboard/onboarding";
import {
  INITIAL_TOPIC_COUNT,
  MAX_TOPIC_RECOMMENDATIONS,
  TOPIC_BATCH_SIZE,
  buildRecommendedTopics,
} from "@/components/v2/dashboard/topics";
import { generateIdeaCards } from "@/lib/ideas";
import {
  type IdeaRecord,
  completeOnboarding as completeOnboardingForAuthor,
  createIdeaFromCard,
  loadIdeaStoreState,
  saveTopicRecommendationCount,
  subscribeToIdeaStore,
} from "@/lib/ideas/client-store";
import { getIdeasForAuthorFromState } from "@/lib/ideas/store";
import { getAuthorByName } from "@/lib/papers/catalog";
import { recommendCollaboratorsForAuthor, recommendPapersForAuthor } from "@/lib/recommendation";
import { dashboardHref, ideaGenerationHref, ideaHref, marketplaceHref } from "@/lib/routes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardClientProps = {
  authorName: string | null;
  onboardingKey: string | null;
  showOnboarding: boolean;
  shouldPersistOnboarding: boolean;
};

export function DashboardClient({
  authorName,
  onboardingKey,
  showOnboarding,
  shouldPersistOnboarding,
}: DashboardClientProps) {
  const router = useRouter();
  const author = authorName ? getAuthorByName(authorName) : null;
  const authorNormalizedName = author?.normalizedName ?? "";
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [dismissedOnboardingAuthor, setDismissedOnboardingAuthor] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [expandedCollaboratorId, setExpandedCollaboratorId] = useState<string | null>(null);
  const [visibleTopicCount, setVisibleTopicCount] = useState(INITIAL_TOPIC_COUNT);

  const authoredPapers = author?.papers.slice(0, 8) ?? [];
  const recommendedPapers = author
    ? recommendPapersForAuthor(author.name, MAX_TOPIC_RECOMMENDATIONS)
    : [];
  const collaborators = author ? recommendCollaboratorsForAuthor(author.name, 10) : [];
  const recommendedTopics = author
    ? buildRecommendedTopics({
        author,
        recommendedPapers,
        collaborators,
        visibleTopicCount,
      })
    : [];
  const hasMoreRecommendedTopics = visibleTopicCount < recommendedPapers.length;
  useEffect(() => {
    let canceled = false;

    async function refreshDashboard() {
      if (!author) {
        setIdeas([]);
        setOnboardingOpen(false);
        return;
      }

      setOnboardingOpen((currentOpen) => {
        if (currentOpen) return true;
        const shouldOpen =
          showOnboarding &&
          dismissedOnboardingAuthor !== author.normalizedName &&
          !hasOnboardingShownThisSession(author.normalizedName, onboardingKey);
        if (shouldOpen) {
          markOnboardingShownThisSession(author.normalizedName, onboardingKey);
        }
        return shouldOpen;
      });
      try {
        const storeState = await loadIdeaStoreState();
        if (canceled) return;
        const currentIdeas = getIdeasForAuthorFromState(storeState, author.name);
        const savedTopicCount =
          storeState.topicRecommendationCountByAuthor[author.normalizedName] ?? INITIAL_TOPIC_COUNT;
        setIdeas(currentIdeas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        setVisibleTopicCount(
          Math.min(recommendedPapers.length, Math.max(INITIAL_TOPIC_COUNT, savedTopicCount)),
        );
      } catch {
        if (!canceled) {
          setIdeas([]);
        }
      }
    }

    void refreshDashboard();
    const unsubscribe = subscribeToIdeaStore(refreshDashboard);

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [author, dismissedOnboardingAuthor, onboardingKey, recommendedPapers.length, showOnboarding]);

  useEffect(() => {
    if (!authorNormalizedName) {
      setVisibleTopicCount(INITIAL_TOPIC_COUNT);
      return;
    }
    setVisibleTopicCount(INITIAL_TOPIC_COUNT);
  }, [authorNormalizedName]);

  if (!author) {
    return (
      <main className="grid min-h-screen place-items-center bg-[--color-bg] p-6 text-neutral-950">
        <section className="max-w-xl rounded-[28px] border border-[#f0c6b8] bg-[#fff2ee] p-6 text-[#8c3f25] shadow-[0_18px_60px_rgba(57,44,18,0.08)]">
          <h1 className="text-2xl font-semibold">Author match required</h1>
          <p className="mt-3 text-sm leading-relaxed">
            Dashboard access requires a matched CHI 2026 author name. Unknown names are blocked
            instead of falling back to another author.
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
  const currentAuthor = author;

  function togglePaper(paperId: string) {
    setSelectedPaperIds((current) => {
      if (current.includes(paperId)) return current.filter((id) => id !== paperId);
      if (current.length >= 5) return current;
      return [...current, paperId];
    });
  }

  function generateSelected() {
    router.push(ideaGenerationHref(currentAuthor.name, "selected", selectedPaperIds));
  }

  async function joinTopic(paperId: string) {
    const card = generateIdeaCards([paperId], currentAuthor.name)[0];
    if (!card) return;
    const idea = await createIdeaFromCard(card, currentAuthor.name);
    if (!idea) return;
    router.push(ideaHref(idea.id, idea.status, currentAuthor.name));
  }

  async function generateMoreTopics() {
    const nextVisibleTopicCount = Math.min(
      recommendedPapers.length,
      visibleTopicCount + TOPIC_BATCH_SIZE,
    );
    setVisibleTopicCount(nextVisibleTopicCount);
    await saveTopicRecommendationCount(currentAuthor.normalizedName, nextVisibleTopicCount);
  }

  async function completeOnboarding() {
    setDismissedOnboardingAuthor(currentAuthor.normalizedName);
    markOnboardingShownThisSession(currentAuthor.normalizedName, onboardingKey);
    await completeOnboardingForAuthor(currentAuthor.normalizedName);
    if (shouldPersistOnboarding) {
      await fetch("/api/onboarding/complete", { method: "POST" });
    }
    setOnboardingOpen(false);
    router.replace(dashboardHref(currentAuthor.name), { scroll: false });
  }

  function showPreviousTutorialStep() {
    setTutorialStepIndex((current) => Math.max(0, current - 1));
  }

  function showNextTutorialStep() {
    setTutorialStepIndex((current) => Math.min(ONBOARDING_STEPS.length - 1, current + 1));
  }

  const currentTutorialStep = ONBOARDING_STEPS[tutorialStepIndex] ?? FIRST_ONBOARDING_STEP;
  const isFirstTutorialStep = tutorialStepIndex === 0;
  const isLastTutorialStep = tutorialStepIndex === ONBOARDING_STEPS.length - 1;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4efe7_0%,#f8f7f2_48%,#ffffff_100%)] px-4 py-6 text-neutral-950 sm:px-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(57,44,18,0.06)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{author.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">{author.affiliation}</p>
        </section>

        <section className="rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(57,44,18,0.06)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                CHI 2026
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                My Publications
              </h2>
            </div>
            <span className="rounded-full bg-[#f4e6c5] px-3 py-1 text-sm font-semibold text-[#6f5210]">
              {selectedPaperIds.length} selected
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {authoredPapers.map((paper) => {
              const checked = selectedPaperIds.includes(paper.id);
              const checkboxId = `paper-select-${paper.id}`;
              return (
                <article
                  key={paper.id}
                  className="flex gap-4 rounded-[20px] border border-neutral-200 bg-[#fcfbf8] p-4 transition hover:border-neutral-400"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selectedPaperIds.length >= 5}
                    onChange={() => togglePaper(paper.id)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300"
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={checkboxId}
                      className="block cursor-pointer text-sm font-semibold text-neutral-900"
                    >
                      {paper.title}
                    </label>
                    <span className="mt-1 block text-xs text-neutral-500">
                      {paper.sessionRoom}
                      {paper.domain ? `, ${paper.domain}` : ""}
                    </span>
                    <details
                      data-paper-description="true"
                      className="mt-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                    >
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 marker:text-neutral-400">
                        Description
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                        {paper.abstract}
                      </p>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(57,44,18,0.06)] sm:p-5 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              My Ideas
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Select up to 5 authored or recommended papers, generate a draft, or reopen an existing
              idea.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              {(["draft", "open"] as const).map((status) => (
                <div key={status} className="rounded-2xl bg-[#f7f4ed] px-2 py-3">
                  <p className="font-semibold capitalize">{status}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {ideas.filter((idea) => idea.status === status).length}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={selectedPaperIds.length === 0}
              onClick={generateSelected}
              className="mt-5 w-full rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
            >
              Generate ideas
            </button>
            <Link
              href={ideaGenerationHref(author.name)}
              className="mt-3 inline-flex w-full justify-center rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              From all experience
            </Link>
            <Link
              href={marketplaceHref(author.name)}
              className="mt-3 inline-flex w-full justify-center rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              Open marketplace
            </Link>

            <div className="mt-5 max-h-[40vh] space-y-3 overflow-y-auto">
              {ideas.map((idea) => (
                <Link
                  key={idea.id}
                  href={ideaHref(idea.id, idea.status, author.name)}
                  className="block rounded-[20px] border border-neutral-200 bg-[#fcfbf8] p-3 transition hover:border-neutral-950"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold">{idea.title}</p>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
                      {idea.status === "locked" ? "private" : idea.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                    {idea.hypothesis}
                  </p>
                </Link>
              ))}
            </div>
          </aside>

          <section
            data-topic-section="true"
            className="rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(57,44,18,0.06)] sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Recommended for me
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Topics and collaborators
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasMoreRecommendedTopics ? (
                  <button
                    type="button"
                    onClick={() => void generateMoreTopics()}
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950"
                  >
                    Generate more
                  </button>
                ) : null}
              </div>
            </div>

            <div
              data-topic-list="true"
              className="mt-5 grid max-h-[70vh] gap-4 overflow-y-auto pr-1"
            >
              {recommendedTopics.map(({ paper, rationale, collaborators: topicCollaborators }) => (
                <article
                  key={paper.id}
                  data-topic-card="true"
                  className="rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                        {paper.sessionRoom}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight">{paper.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{rationale}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void joinTopic(paper.id)}
                      className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Join topic
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {topicCollaborators.map((collaborator) => {
                      const isExpanded = expandedCollaboratorId === collaborator.id;
                      return (
                        <button
                          key={collaborator.id}
                          type="button"
                          data-collaborator-name="true"
                          onClick={() =>
                            setExpandedCollaboratorId(isExpanded ? null : collaborator.id)
                          }
                          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950"
                        >
                          {collaborator.name}
                        </button>
                      );
                    })}
                  </div>

                  {topicCollaborators.map((collaborator) =>
                    expandedCollaboratorId === collaborator.id ? (
                      <section
                        key={collaborator.id}
                        data-collaborator-work="true"
                        className="mt-4 rounded-[20px] border border-neutral-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold">{collaborator.name}</h4>
                            <p className="mt-1 text-xs text-neutral-500">
                              {collaborator.affiliation}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#f4e6c5] px-3 py-1 text-xs font-semibold text-[#6f5210]">
                            {collaborator.papers.length} papers
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3">
                          {collaborator.papers.slice(0, 3).map((work) => (
                            <article
                              key={work.id}
                              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-[#f7f4ed] p-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{work.title}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                                  {work.sessionRoom}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void joinTopic(work.id)}
                                className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950"
                              >
                                Join topic
                              </button>
                            </article>
                          ))}
                        </div>
                      </section>
                    ) : null,
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      {onboardingOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-3 sm:p-5">
          <dialog
            aria-labelledby="onboarding-title"
            aria-modal="true"
            data-tutorial-dialog
            open={true}
            className="relative m-0 block max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] border-0 bg-white p-4 text-neutral-950 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:max-h-[calc(100vh-2.5rem)] sm:p-6 lg:max-w-4xl"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Setup tutorial
                </p>
                <h2 id="onboarding-title" className="mt-2 text-2xl font-semibold sm:text-3xl">
                  ResearchGit workflow
                </h2>
              </div>
              <span className="w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                Step {tutorialStepIndex + 1} of {ONBOARDING_STEPS.length}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-6 gap-2" aria-hidden="true">
              {ONBOARDING_STEPS.map((step, index) => (
                <span
                  key={step.title}
                  className={`h-2 rounded-full ${
                    index <= tutorialStepIndex ? "bg-neutral-950" : "bg-neutral-200"
                  }`}
                />
              ))}
            </div>

            <article className="mt-5 rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4 sm:mt-6 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Feature walkthrough
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                {currentTutorialStep.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {currentTutorialStep.body}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Focus
                  </p>
                  <p className="mt-2 text-sm font-semibold text-neutral-950">
                    {currentTutorialStep.focus}
                  </p>
                </div>
                <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Action
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                    {currentTutorialStep.action}
                  </p>
                </div>
              </div>
            </article>

            <div className="mt-5 grid gap-3 sm:mt-6 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={showPreviousTutorialStep}
                disabled={isFirstTutorialStep}
                className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 disabled:border-neutral-200 disabled:text-neutral-300"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  isLastTutorialStep ? void completeOnboarding() : showNextTutorialStep()
                }
                className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                {isLastTutorialStep ? "Done" : "Next feature"}
              </button>
              <button
                type="button"
                onClick={() => void completeOnboarding()}
                className="rounded-full px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950"
              >
                Skip tutorial
              </button>
            </div>
          </dialog>
        </div>
      ) : null}
    </main>
  );
}
