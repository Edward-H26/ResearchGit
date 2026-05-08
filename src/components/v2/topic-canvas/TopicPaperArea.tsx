import type { CatalogTopic } from "@/lib/recommendation";
import { topicPaperHref } from "@/lib/routes";
import Link from "next/link";

type TopicPaperAreaProps = {
  topic: CatalogTopic;
  viewerName: string;
  activePaperId?: string | null;
};

export function TopicPaperArea({ topic, viewerName, activePaperId = null }: TopicPaperAreaProps) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(57,44,18,0.08)] sm:p-6">
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Paper area
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Same-topic CHI 2026 papers</h2>
        </div>
      </div>
      <div className="mt-5 grid max-h-[28rem] gap-3 overflow-y-auto pr-1">
        {topic.papers.map((paper) => {
          const isActivePaper = paper.id === activePaperId;
          return (
            <article
              key={paper.id}
              id={`topic-paper-${paper.id}`}
              data-topic-paper-row="true"
              className={`rounded-[22px] border p-4 ${
                isActivePaper ? "border-neutral-950 bg-white" : "border-neutral-200 bg-[#fcfbf8]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold tracking-tight">{paper.title}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    {paper.sessionRoom}
                    {paper.domain ? `, ${paper.domain}` : ""}
                  </p>
                </div>
                <Link
                  href={topicPaperHref(topic.id, paper.id, viewerName)}
                  className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950"
                >
                  {isActivePaper ? "Current paper" : "Open paper"}
                </Link>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-600">
                {paper.abstract}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
