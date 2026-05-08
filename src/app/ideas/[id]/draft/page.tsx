import { IdeaDraftClient } from "@/components/v2/IdeaDraftClient";
import { auth } from "@/lib/auth";
import { resolvePageAuthor } from "@/lib/auth/author";

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
  const author = resolvePageAuthor(session, query.author);

  return <IdeaDraftClient ideaId={id} authorName={author?.name ?? null} />;
}
