"use client";

import { GeneratedTopicReviewDialog } from "@/components/v2/dashboard/GeneratedTopicReviewDialog";
import { topicActivityFromIdeas } from "@/components/v2/dashboard/activity";
import type { IdeaRecord } from "@/lib/ideas/client-store";
import type { AuthorProfile } from "@/lib/papers/catalog";
import type { RecommendedTopic } from "@/lib/recommendation";
import { marketplaceHref, topicHref } from "@/lib/routes";
import Link from "next/link";

type TopicRecommendationsSectionProps = {
  currentAuthor: AuthorProfile;
  ideas: IdeaRecord[];
  recommendedTopics: RecommendedTopic[];
  joinedTopicIds: string[];
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

export function TopicRecommendationsSection({
  currentAuthor,
  ideas,
  recommendedTopics,
  joinedTopicIds,
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
            Topics are generated from CHI 2026 session groups in src/data/papers_by_room.json.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-start sm:justify-self-end">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onGenerateMoreTopics();
            }}
            data-topic-generate-form="true"
            className={
              isTopicSearchOpen
                ? "grid w-full gap-2 sm:w-[20rem] md:w-[26rem] md:grid-cols-[minmax(0,1fr)_auto]"
                : "w-full sm:w-auto"
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
          <Link
            href={marketplaceHref(currentAuthor.name)}
            className="inline-flex justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Marketplace
          </Link>
        </div>
      </div>

      <div data-topic-list="true" className="mt-5 grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
        {recommendedTopics.map((recommendation) => {
          const { topic, rationale } = recommendation;
          const activity = topicActivityFromIdeas(ideas, recommendation, joinedTopicIds);
          return (
            <article
              key={topic.id}
              id={`topic-card-${topic.id}`}
              data-topic-card="true"
              className="rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    {topic.source}, {topic.papers.length} paper(s)
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-tight">{topic.label}</h3>
                    {activity.statusLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{rationale}</p>
                  <div data-topic-activity="true" className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                      {activity.noteCount} note(s)
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                      {activity.commentCount} comment(s)
                    </span>
                  </div>
                </div>
                {activity.isJoined ? (
                  <Link
                    href={topicHref(topic.id, currentAuthor.name)}
                    className="inline-flex min-w-32 justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Open canvas
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => onJoinTopic(topic.id)}
                    className="inline-flex min-w-32 justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Join topic
                  </button>
                )}
              </div>
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
