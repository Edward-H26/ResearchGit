"use client";

import { ReviseDialog } from "@/components/ai/ReviseDialog";
import type { StickyNote } from "@/lib/canvas/schema";
import type { AnchorPaperSummary, IdeaVersionRow } from "@/lib/idea/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type IdeaPaneLeftProps = {
  ideaId: string;
  themeLabel: string;
  versions: ReadonlyArray<IdeaVersionRow>;
  anchorPapers: ReadonlyArray<AnchorPaperSummary>;
  currentNotes?: ReadonlyArray<StickyNote>;
};

export function IdeaPaneLeft(props: IdeaPaneLeftProps) {
  const router = useRouter();
  const sortedDesc = useMemo(
    () => [...props.versions].sort((a, b) => b.ord - a.ord),
    [props.versions],
  );
  const [activeId, setActiveId] = useState<string>(sortedDesc[0]?.id ?? "");
  const [reviseOpen, setReviseOpen] = useState(false);
  const active = sortedDesc.find((v) => v.id === activeId) ?? sortedDesc[0];

  useEffect(() => {
    setActiveId((current) => {
      if (current && sortedDesc.some((version) => version.id === current)) {
        return current;
      }
      return sortedDesc[0]?.id ?? "";
    });
  }, [sortedDesc]);

  if (!active) {
    return (
      <aside className="flex h-full flex-col border-r border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-500">No idea versions to display.</p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-6">
        <Link
          href="/deck"
          className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          ← All ideas
        </Link>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
          {props.themeLabel}
        </p>
        <h1 className="mt-1 text-xl font-semibold leading-tight tracking-tight">{active.title}</h1>
        <p className="mt-3 text-sm font-medium text-neutral-700">{active.researchQuestion}</p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">{active.rationale}</p>
      </div>

      <div className="border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
            Versions ({sortedDesc.length})
          </p>
          <button
            type="button"
            onClick={() => setReviseOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-neutral-800"
          >
            ✨ Revise with AI
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {sortedDesc.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setActiveId(v.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                  v.id === active.id
                    ? "bg-neutral-950 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                <span className="font-medium">
                  {v.ord === 0 ? "Original (LLM)" : `Rev ${v.ord}`}
                </span>
                {v.changelog ? (
                  <span
                    className={v.id === active.id ? "ml-2 opacity-80" : "ml-2 text-neutral-500"}
                  >
                    — {v.changelog}
                  </span>
                ) : null}
                {v.createdByHandle ? (
                  <span
                    className={
                      v.id === active.id
                        ? "ml-2 text-[10px] uppercase tracking-wider opacity-70"
                        : "ml-2 text-[10px] uppercase tracking-wider text-neutral-500"
                    }
                  >
                    by {v.createdByHandle}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Proposal
        </p>
        <article className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
          {active.proposalMarkdown}
        </article>

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Anchor papers
        </p>
        <ul className="mt-2 space-y-2">
          {props.anchorPapers.map((p) => (
            <li key={p.paperId} className="rounded-xl bg-neutral-50 p-3 text-xs">
              <p className="font-medium text-neutral-900">{p.title}</p>
              {p.venue ? <p className="mt-1 text-neutral-500">{p.venue}</p> : null}
            </li>
          ))}
        </ul>
      </div>

      <ReviseDialog
        ideaId={props.ideaId}
        notes={props.currentNotes ?? []}
        open={reviseOpen}
        onClose={() => setReviseOpen(false)}
        onAccepted={() => {
          setReviseOpen(false);
          router.refresh();
        }}
      />
    </aside>
  );
}
