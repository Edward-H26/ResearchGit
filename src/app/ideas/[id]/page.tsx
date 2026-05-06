import { IdeaDetailClient } from "@/components/v2/IdeaDetailClient";
import { auth } from "@/lib/auth";
import { getAuthorByName } from "@/lib/papers/catalog";

type IdeaDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    author?: string;
  }>;
};

export default async function IdeaDetailPage({ params, searchParams }: IdeaDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const session = await auth();
  const author =
    (query.author ? getAuthorByName(query.author) : null) ??
    (session?.user?.name ? getAuthorByName(session.user.name) : null);

  return <IdeaDetailClient ideaId={id} viewerName={author?.name ?? null} />;
}
