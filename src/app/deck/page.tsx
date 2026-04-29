import { IdeaCard } from "@/components/deck/IdeaCard";
import { OnboardingTour, markOnboardingCompletedAction } from "@/components/onboarding";
import { isAdmin } from "@/lib/auth";
import { requireSessionUser } from "@/lib/auth/guards";
import { getActiveDeck } from "@/server/deck-service";
import { getOnboardingCompleted } from "@/server/user-service";
import Link from "next/link";

export default async function DeckPage() {
  const user = await requireSessionUser();

  const [deck, onboardingDone] = await Promise.all([
    getActiveDeck(),
    getOnboardingCompleted(user.id),
  ]);
  const userIsAdmin = isAdmin(user.email);
  const showOnboarding = !onboardingDone;

  if (!deck || deck.ideas.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <OnboardingTour open={showOnboarding} onComplete={markOnboardingCompletedAction} />
        <div className="w-full max-w-lg space-y-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">No deck yet</h1>
          <p className="text-neutral-500">
            An admin needs to generate the first deck. Once 10 ideas are in the database, this page
            will show them.
          </p>
          {userIsAdmin ? (
            <Link
              href="/admin/regenerate"
              className="inline-block rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Open admin regenerate
            </Link>
          ) : (
            <p className="text-xs text-neutral-400">
              You are signed in as {user.email}, which is not in ADMIN_EMAILS.
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <OnboardingTour open={showOnboarding} onComplete={markOnboardingCompletedAction} />
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Pick an idea to explore</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Click a card to open its co-design canvas.
            </p>
          </div>
          <p className="text-xs text-neutral-400">{deck.ideas.length} ideas in the active deck</p>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {deck.ideas.map((idea) => (
            <IdeaCard
              key={idea.ideaId}
              ideaId={idea.ideaId}
              title={idea.latestVersion.title}
              researchQuestion={idea.latestVersion.researchQuestion}
              rationale={idea.latestVersion.rationale}
              themeLabel={idea.themeLabel}
              anchorPapers={idea.anchorPapers}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
