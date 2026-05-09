"use client";

import type { CatalogPaper } from "@/lib/papers/catalog";

type PublicationsSectionProps = {
  papers: CatalogPaper[];
  selectedPaperIds: string[];
  onTogglePaper: (paperId: string) => void;
  onGenerateSelected: () => void;
};

export function PublicationsSection({
  papers,
  selectedPaperIds,
  onTogglePaper,
  onGenerateSelected,
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#f4e6c5] px-3 py-1 text-sm font-semibold text-[#6f5210]">
            {selectedPaperIds.length} selected
          </span>
          <button
            type="button"
            disabled={selectedPaperIds.length === 0}
            onClick={onGenerateSelected}
            className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
          >
            Generate draft
          </button>
        </div>
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
