"use client";

import type { RecommendedTopic } from "@/lib/recommendation";

type GeneratedTopicReviewDialogProps = {
  recommendations: RecommendedTopic[];
  generatedTopicQuery: string;
  selectedTopicIds: string[];
  onClose: () => void;
  onGenerateNewTopics: () => void;
  onToggleTopic: (topicId: string) => void;
  onConfirm: () => void;
};

export function GeneratedTopicReviewDialog({
  recommendations,
  generatedTopicQuery,
  selectedTopicIds,
  onClose,
  onGenerateNewTopics,
  onToggleTopic,
  onConfirm,
}: GeneratedTopicReviewDialogProps) {
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
