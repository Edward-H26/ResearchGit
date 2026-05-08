"use client";

import type { DashboardOnboardingStep } from "@/components/v2/dashboard/onboarding";
import type { IdeaRecord } from "@/lib/ideas/client-store";
import type { AuthorProfile, CatalogPaper } from "@/lib/papers/catalog";
import type { RecommendedTopic } from "@/lib/recommendation";
import {
  ideaGenerationHref,
  ideaHref,
  marketplaceHref,
  topicHref,
  topicPaperHref,
} from "@/lib/routes";
import Link from "next/link";
import { useState } from "react";

type DashboardHeroProps = {
  author: AuthorProfile;
};

type PublicationsSectionProps = {
  papers: CatalogPaper[];
  selectedPaperIds: string[];
  onTogglePaper: (paperId: string) => void;
};

type IdeaWorkspaceSectionProps = {
  authorName: string;
  ideas: IdeaRecord[];
  selectedPaperCount: number;
  onGenerateSelected: () => void;
};

type TopicRecommendationsSectionProps = {
  currentAuthor: AuthorProfile;
  recommendedTopics: RecommendedTopic[];
  selectedTopicId: string | null;
  activeTopicIdea: IdeaRecord | null;
  topicKeywordQuery: string;
  isTopicSearchOpen: boolean;
  isGeneratingTopics: boolean;
  generatedTopicQuery: string;
  isTopicReviewOpen: boolean;
  topicReviewRecommendations: RecommendedTopic[];
  selectedGeneratedTopicIds: string[];
  onTopicKeywordQueryChange: (value: string) => void;
  onGenerateMoreTopics: () => void;
  onJoinTopic: (topicId: string) => void;
  onCloseTopicReview: () => void;
  onGenerateNewTopicSearch: () => void;
  onToggleGeneratedTopic: (topicId: string) => void;
  onConfirmGeneratedTopics: () => void;
};

type OnboardingDialogProps = {
  currentStep: DashboardOnboardingStep;
  currentStepIndex: number;
  stepCount: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
};

export function AuthorRequiredFallback() {
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

export function DashboardHero({ author }: DashboardHeroProps) {
  return (
    <section className="rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(57,44,18,0.06)] sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
        Dashboard
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{author.name}</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{author.affiliation}</p>
    </section>
  );
}

export function PublicationsSection({
  papers,
  selectedPaperIds,
  onTogglePaper,
}: PublicationsSectionProps) {
  return (
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
        {papers.map((paper) => {
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
                onChange={() => onTogglePaper(paper.id)}
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
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">{paper.abstract}</p>
                </details>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function IdeaWorkspaceSection({
  authorName,
  ideas,
  selectedPaperCount,
  onGenerateSelected,
}: IdeaWorkspaceSectionProps) {
  return (
    <section
      data-idea-actions="true"
      className="rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(57,44,18,0.06)] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Ideas
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            My idea workspace
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Select up to 5 publications, generate a draft, open all-paper recommendations, or browse
            the marketplace.
          </p>
        </div>
      </div>

      <div className="mt-5 max-h-[36rem] overflow-y-auto pr-1">
        <div
          className="grid gap-3 text-center"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
          }}
        >
          {(["draft", "open"] as const).map((status) => (
            <div
              key={status}
              data-idea-summary-stat="true"
              className="grid min-h-[6rem] place-items-center rounded-[24px] bg-[#f7f4ed] px-4 py-4"
            >
              <div>
                <p className="text-sm font-semibold capitalize">{status}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {ideas.filter((idea) => idea.status === status).length}
                </p>
              </div>
            </div>
          ))}
          <div
            data-idea-summary-stat="true"
            className="grid min-h-[6rem] place-items-center rounded-[24px] bg-[#f7f4ed] px-4 py-4"
          >
            <div>
              <p className="text-sm font-semibold">Selected</p>
              <p className="mt-1 text-2xl font-semibold">{selectedPaperCount}</p>
            </div>
          </div>
        </div>

        <div
          className="mt-5 grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
          }}
        >
          <button
            type="button"
            disabled={selectedPaperCount === 0}
            onClick={onGenerateSelected}
            className="inline-flex min-h-[5.25rem] items-center justify-center rounded-full bg-neutral-950 px-5 py-3 text-center text-sm font-semibold leading-snug text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            Generate ideas
          </button>
          <Link
            href={ideaGenerationHref(authorName)}
            className="inline-flex min-h-[5.25rem] items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-center text-sm font-semibold leading-snug text-neutral-800 transition hover:border-neutral-950"
          >
            From all my papers at CHI 2026
          </Link>
          <Link
            href={marketplaceHref(authorName)}
            className="inline-flex min-h-[5.25rem] items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-center text-sm font-semibold leading-snug text-neutral-800 transition hover:border-neutral-950"
          >
            Marketplace
          </Link>
        </div>

        <div
          className="mt-5 grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
          }}
        >
          {ideas.length === 0 ? (
            <p className="rounded-[20px] border border-neutral-200 bg-[#fcfbf8] p-4 text-sm text-neutral-500">
              No saved ideas yet.
            </p>
          ) : null}
          {ideas.map((idea) => (
            <Link
              key={idea.id}
              href={ideaHref(idea.id, idea.status, authorName)}
              className="block rounded-[20px] border border-neutral-200 bg-[#fcfbf8] p-4 transition hover:border-neutral-950"
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
      </div>
    </section>
  );
}

export function TopicRecommendationsSection({
  currentAuthor,
  recommendedTopics,
  selectedTopicId,
  activeTopicIdea,
  topicKeywordQuery,
  isTopicSearchOpen,
  isGeneratingTopics,
  generatedTopicQuery,
  isTopicReviewOpen,
  topicReviewRecommendations,
  selectedGeneratedTopicIds,
  onTopicKeywordQueryChange,
  onGenerateMoreTopics,
  onJoinTopic,
  onCloseTopicReview,
  onGenerateNewTopicSearch,
  onToggleGeneratedTopic,
  onConfirmGeneratedTopics,
}: TopicRecommendationsSectionProps) {
  return (
    <section
      data-topic-section="true"
      className="rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(57,44,18,0.06)] sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Recommended for me
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Broader topics</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Topics are generated from CHI 2026 session groups in papers_by_room.json.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onGenerateMoreTopics();
          }}
          data-topic-generate-form="true"
          className={
            isTopicSearchOpen
              ? "grid w-full gap-2 sm:w-[20rem] sm:justify-self-end md:w-[26rem] md:grid-cols-[minmax(0,1fr)_auto]"
              : "w-full sm:w-auto sm:justify-self-end"
          }
        >
          {isTopicSearchOpen ? (
            <input
              id="topic-keyword-search"
              aria-label="Keywords for similar topics"
              value={topicKeywordQuery}
              onChange={(event) => onTopicKeywordQueryChange(event.target.value)}
              placeholder="Keywords for similar topics"
              className="min-w-0 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm outline-none focus:border-neutral-950"
            />
          ) : null}
          <button
            aria-label="Generate more topics"
            type="submit"
            disabled={
              isGeneratingTopics || (isTopicSearchOpen && topicKeywordQuery.trim().length === 0)
            }
            className="w-full rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 disabled:text-neutral-300 sm:w-auto"
          >
            {isGeneratingTopics ? "Generating..." : "Generate more"}
          </button>
        </form>
      </div>

      <div data-topic-list="true" className="mt-5 grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
        {recommendedTopics.map((recommendation) => {
          const { topic, rationale, recommendedPapers } = recommendation;
          const isSelectedTopic = selectedTopicId === topic.id;
          const topicIdea = isSelectedTopic ? activeTopicIdea : null;
          return (
            <article
              key={topic.id}
              id={`topic-card-${topic.id}`}
              data-topic-card="true"
              className="rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-l-4 border-[#3d73d8] pl-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    {topic.source}, {topic.papers.length} paper(s)
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{topic.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{rationale}</p>
                </div>
                {isSelectedTopic ? null : (
                  <button
                    type="button"
                    onClick={() => onJoinTopic(topic.id)}
                    className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Join topic
                  </button>
                )}
              </div>

              {topicIdea ? (
                <JoinedTopicPreview
                  currentAuthor={currentAuthor}
                  recommendation={recommendation}
                  idea={topicIdea}
                />
              ) : (
                <div className="mt-4 grid gap-2">
                  {recommendedPapers.slice(0, 3).map((paper) => (
                    <article
                      key={paper.id}
                      className="rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                    >
                      <p className="line-clamp-1 text-sm font-semibold">{paper.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {paper.authors.slice(0, 3).join(", ")}
                        {paper.authors.length > 3 ? " et al." : ""}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">{paper.date}</p>
                    </article>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {isTopicReviewOpen ? (
        <GeneratedTopicReviewDialog
          recommendations={topicReviewRecommendations}
          generatedTopicQuery={generatedTopicQuery}
          selectedTopicIds={selectedGeneratedTopicIds}
          onClose={onCloseTopicReview}
          onGenerateNewTopics={onGenerateNewTopicSearch}
          onToggleTopic={onToggleGeneratedTopic}
          onConfirm={onConfirmGeneratedTopics}
        />
      ) : null}
    </section>
  );
}

function GeneratedTopicReviewDialog({
  recommendations,
  generatedTopicQuery,
  selectedTopicIds,
  onClose,
  onGenerateNewTopics,
  onToggleTopic,
  onConfirm,
}: {
  recommendations: RecommendedTopic[];
  generatedTopicQuery: string;
  selectedTopicIds: string[];
  onClose: () => void;
  onGenerateNewTopics: () => void;
  onToggleTopic: (topicId: string) => void;
  onConfirm: () => void;
}) {
  const hasTopics = recommendations.length > 0;
  const selectedTopics = recommendations.filter((recommendation) =>
    selectedTopicIds.includes(recommendation.topic.id),
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 sm:p-5">
      <button
        type="button"
        aria-label="Cancel generated topics"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
      />
      <dialog
        aria-modal="true"
        aria-labelledby="generated-topic-review-title"
        data-generated-topic-review="true"
        open={true}
        className="relative m-0 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 text-neutral-950 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Generated topics
            </p>
            <h3
              id="generated-topic-review-title"
              className="mt-2 text-2xl font-semibold tracking-tight"
            >
              Review suggested sessions
            </h3>
          </div>
          <button
            type="button"
            onClick={onGenerateNewTopics}
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Generate new topics
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          {hasTopics
            ? `Generated ${recommendations.length} session topic(s) from "${generatedTopicQuery}".`
            : `No matching session topics were generated from "${generatedTopicQuery}".`}
        </p>

        {selectedTopics.length > 0 ? (
          <div
            data-selected-generated-topics="true"
            className="mt-4 rounded-[20px] border border-neutral-200 bg-[#f7f4ed] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Selected sessions
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTopics.map((recommendation) => (
                <button
                  key={recommendation.topic.id}
                  type="button"
                  onClick={() => onToggleTopic(recommendation.topic.id)}
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100"
                >
                  {recommendation.topic.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {hasTopics ? (
          <div className="mt-5 grid max-h-[48vh] gap-3 overflow-y-auto pr-1">
            {recommendations.map((recommendation, index) => {
              const isSelected = selectedTopicIds.includes(recommendation.topic.id);
              return (
                <article
                  key={recommendation.topic.id}
                  data-generated-topic-option="true"
                  className={`rounded-[24px] border p-4 transition ${
                    isSelected
                      ? "border-neutral-950 bg-[#f7f4ed]"
                      : "border-neutral-200 bg-[#fcfbf8]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                        {recommendation.topic.source}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold tracking-tight">
                        {recommendation.topic.label}
                      </h4>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
                      {index + 1} of {recommendations.length}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                    {recommendation.rationale}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {recommendation.recommendedPapers.slice(0, 2).map((paper) => (
                      <div
                        key={paper.id}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                      >
                        <p className="line-clamp-1 text-sm font-semibold">{paper.title}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {paper.authors.slice(0, 3).join(", ")}
                          {paper.authors.length > 3 ? " et al." : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleTopic(recommendation.topic.id)}
                    className={`mt-4 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "bg-neutral-950 text-white hover:bg-neutral-800"
                        : "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-950"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select topic"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-[20px] border border-neutral-200 bg-[#fcfbf8] p-4 text-sm leading-relaxed text-neutral-600">
            Try a different keyword such as latency, collaboration, accessibility, or visualization.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={selectedTopicIds.length === 0}
            className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            Confirm and join
          </button>
        </div>
      </dialog>
    </div>
  );
}

function JoinedTopicPreview({
  currentAuthor,
  recommendation,
  idea,
}: {
  currentAuthor: AuthorProfile;
  recommendation: RecommendedTopic;
  idea: IdeaRecord;
}) {
  const [isPaperBrowserOpen, setIsPaperBrowserOpen] = useState(false);

  return (
    <section
      id="topic-workspace"
      data-inline-topic-workspace="true"
      className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Session workspace
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">
            {recommendation.topic.label}
          </h3>
          <p className="mt-2 text-sm text-neutral-500">{recommendation.topic.source}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
            {idea.notes.length} note(s)
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
            {idea.comments.length} comment(s)
          </span>
          <Link
            href={topicHref(recommendation.topic.id, currentAuthor.name)}
            className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            Open canvas
          </Link>
        </div>
      </div>

      <section
        data-topic-paper-browser="true"
        className="mt-5 rounded-[20px] border border-neutral-200 bg-[#fcfbf8] p-4"
      >
        <button
          type="button"
          aria-expanded={isPaperBrowserOpen}
          onClick={() => setIsPaperBrowserOpen((value) => !value)}
          className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Papers
            </span>
            <span className="mt-1 block text-xl font-semibold tracking-tight">
              Session paper browser
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              {recommendation.topic.papers.length} record(s)
            </span>
            <span className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
              {isPaperBrowserOpen ? "Fold" : "Unfold"}
            </span>
          </span>
        </button>
        {isPaperBrowserOpen ? (
          <div className="mt-4 grid max-h-[34rem] gap-3 overflow-y-auto pr-1">
            {recommendation.topic.papers.map((paper) => (
              <article
                key={paper.id}
                data-topic-paper-row="true"
                className="rounded-[20px] border border-neutral-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-base font-semibold tracking-tight">{paper.title}</h5>
                    <p className="mt-1 text-xs text-neutral-500">
                      {paper.authors.slice(0, 4).join(", ")}
                      {paper.authors.length > 4 ? " et al." : ""}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{paper.date}</p>
                  </div>
                  <Link
                    href={topicPaperHref(recommendation.topic.id, paper.id, currentAuthor.name)}
                    className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950"
                  >
                    Open paper
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

export function OnboardingDialog({
  currentStep,
  currentStepIndex,
  stepCount,
  isFirstStep,
  isLastStep,
  onPrevious,
  onNext,
  onComplete,
}: OnboardingDialogProps) {
  const progressMarkers = Array.from({ length: stepCount }, (_, index) => ({
    id: `tutorial-progress-${index + 1}`,
    isComplete: index <= currentStepIndex,
  }));

  return (
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
            Step {currentStepIndex + 1} of {stepCount}
          </span>
        </div>

        <div
          className="mt-5 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {progressMarkers.map((marker) => (
            <span
              key={marker.id}
              className={`h-2 rounded-full ${marker.isComplete ? "bg-neutral-950" : "bg-neutral-200"}`}
            />
          ))}
        </div>

        <article className="mt-5 rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4 sm:mt-6 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Guided workflow
            </p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
              {currentStep.label}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {currentStep.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{currentStep.body}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Where
              </p>
              <p className="mt-2 text-sm font-semibold text-neutral-950">{currentStep.location}</p>
            </div>
            <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Use when
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{currentStep.useWhen}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Do this
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{currentStep.action}</p>
            </div>
            <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Next
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{currentStep.next}</p>
            </div>
          </div>
        </article>

        <div className="mt-5 grid gap-3 sm:mt-6 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onPrevious}
            disabled={isFirstStep}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 disabled:border-neutral-200 disabled:text-neutral-300"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={isLastStep ? onComplete : onNext}
            className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            {isLastStep ? "Done" : "Next step"}
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="rounded-full px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950"
          >
            Skip tutorial
          </button>
        </div>
      </dialog>
    </div>
  );
}
