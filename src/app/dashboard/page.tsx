import { DashboardClient } from "@/components/v2/DashboardClient";
import { auth } from "@/lib/auth";
import { getAuthorByName } from "@/lib/papers/catalog";
import { getOnboardingCompleted } from "@/server/user-service";

type DashboardPageProps = {
  searchParams?: Promise<{
    author?: string;
    onboard?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const session = await auth();
  const author =
    (params.author ? getAuthorByName(params.author) : null) ??
    (session?.user?.matchedAuthorName ? getAuthorByName(session.user.matchedAuthorName) : null) ??
    (session?.user?.name ? getAuthorByName(session.user.name) : null);
  const onboardingCompleted = session?.user?.id
    ? await getOnboardingCompleted(session.user.id)
    : false;
  const shouldShowOnboarding =
    Boolean(params.onboard) || Boolean(session?.user?.id && author && !onboardingCompleted);

  return (
    <DashboardClient
      authorName={author?.name ?? null}
      onboardingKey={params.onboard ?? session?.user?.id ?? null}
      showOnboarding={shouldShowOnboarding}
      shouldPersistOnboarding={Boolean(session?.user?.id)}
    />
  );
}
