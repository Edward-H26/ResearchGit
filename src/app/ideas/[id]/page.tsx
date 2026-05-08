import { IdeaDetailClient } from "@/components/v2/IdeaDetailClient";
import { auth } from "@/lib/auth";
import { resolvePageAuthor } from "@/lib/auth/author";

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
  const author = resolvePageAuthor(session, query.author);

  return <IdeaDetailClient ideaId={id} viewerName={author?.name ?? null} />;
}
