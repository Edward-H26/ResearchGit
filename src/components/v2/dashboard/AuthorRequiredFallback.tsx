"use client";

import Link from "next/link";

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
