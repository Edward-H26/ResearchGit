import { isGoogleAuthConfigured, signIn } from "@/lib/auth";
import Link from "next/link";

const AUTHOR_LOOKUP_PATH = "/login";
const CONTINUE_BUTTON_CLASSES =
  "inline-flex w-fit items-center justify-center rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800";

async function continueWithGoogle() {
  "use server";

  await signIn("google", { redirectTo: AUTHOR_LOOKUP_PATH });
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4efe7] px-5 py-8 text-neutral-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center">
        <p className="font-mono-tiny uppercase tracking-[0.22em] text-neutral-950">
          ResearchGit V2
        </p>
        <h1 className="mt-8 max-w-6xl font-serif text-5xl font-medium leading-[0.95] tracking-normal text-neutral-950 sm:text-7xl lg:text-8xl">
          Sign in as a CHI 2026 author.
        </h1>
        <p className="mt-10 max-w-5xl text-lg leading-relaxed text-neutral-950 sm:text-2xl">
          Match your author name to the CHI 2026 program, confirm the paper record, then continue
          into recommendations, drafting, marketplace feedback, and saved versions.
        </p>
        {isGoogleAuthConfigured() ? (
          <form action={continueWithGoogle} className="mt-10 w-fit">
            <button type="submit" className={CONTINUE_BUTTON_CLASSES}>
              Continue with Google
            </button>
          </form>
        ) : (
          <Link href={AUTHOR_LOOKUP_PATH} className={`mt-10 ${CONTINUE_BUTTON_CLASSES}`}>
            Continue with Google
          </Link>
        )}
      </section>
    </main>
  );
}
