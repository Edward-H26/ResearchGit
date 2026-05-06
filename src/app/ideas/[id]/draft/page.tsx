import { IdeaDraftClient } from "@/components/v2/IdeaDraftClient";
import { auth } from "@/lib/auth";
import { getAuthorByName } from "@/lib/papers/catalog";

type IdeaDraftPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    author?: string;
  }>;
};

export default async function IdeaDraftPage({ params, searchParams }: IdeaDraftPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const session = await auth();
  const author =
    (query.author ? getAuthorByName(query.author) : null) ??
    (session?.user?.name ? getAuthorByName(session.user.name) : null);

  return <IdeaDraftClient ideaId={id} authorName={author?.name ?? null} />;
}
