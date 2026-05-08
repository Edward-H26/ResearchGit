import { DashboardClient } from "@/components/v2/DashboardClient";
import { auth } from "@/lib/auth";
import { resolvePageAuthor } from "@/lib/auth/author";
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
  const author = resolvePageAuthor(session, params.author);
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
