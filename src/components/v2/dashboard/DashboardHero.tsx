"use client";

import type { AuthorProfile } from "@/lib/papers/catalog";

type DashboardHeroProps = {
  author: AuthorProfile;
};

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
