import { MarketplaceClient } from "@/components/v2/MarketplaceClient";
import { auth } from "@/lib/auth";
import { resolvePageAuthor } from "@/lib/auth/author";

type MarketplacePageProps = {
  searchParams?: Promise<{
    author?: string;
  }>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = (await searchParams) ?? {};
  const session = await auth();
  const author = resolvePageAuthor(session, params.author);

  return <MarketplaceClient viewerName={author?.name ?? null} />;
}
