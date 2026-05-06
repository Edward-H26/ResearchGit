import { MarketplaceClient } from "@/components/v2/MarketplaceClient";
import { auth } from "@/lib/auth";
import { getAuthorByName } from "@/lib/papers/catalog";

type MarketplacePageProps = {
  searchParams?: Promise<{
    author?: string;
  }>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = (await searchParams) ?? {};
  const session = await auth();
  const author =
    (params.author ? getAuthorByName(params.author) : null) ??
    (session?.user?.name ? getAuthorByName(session.user.name) : null);

  return <MarketplaceClient viewerName={author?.name ?? null} />;
}
