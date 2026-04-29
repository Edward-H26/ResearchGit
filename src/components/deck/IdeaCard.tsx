import type { AnchorPaperSummary } from "@/lib/idea/contracts";
import Link from "next/link";

export type IdeaCardProps = {
  ideaId: string;
  title: string;
  researchQuestion: string;
  rationale: string;
  themeLabel: string;
  anchorPapers: ReadonlyArray<Pick<AnchorPaperSummary, "paperId" | "title" | "venue">>;
};

export function IdeaCard(props: IdeaCardProps) {
  return (
    <Link
      href={`/idea/${props.ideaId}`}
      className="group flex h-full flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-950 hover:shadow-lg"
    >
      <span className="inline-flex w-fit items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
        {props.themeLabel}
      </span>
      <h3 className="mt-3 text-lg font-semibold leading-tight tracking-tight text-neutral-950 group-hover:underline">
        {props.title}
      </h3>
      <p className="mt-3 text-sm font-medium text-neutral-700">{props.researchQuestion}</p>
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-neutral-500">
        {props.rationale}
      </p>
      <div className="mt-auto pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Anchor papers
        </p>
        <ul className="mt-2 space-y-1">
          {props.anchorPapers.slice(0, 3).map((p) => (
            <li
              key={p.paperId}
              className="truncate rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700"
              title={p.title}
            >
              {p.title}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
