import { IdeaGenerationClient } from "@/components/v2/IdeaGenerationClient";
import { auth } from "@/lib/auth";
import { getAuthorByName } from "@/lib/papers/catalog";

type IdeaGenerationPageProps = {
  searchParams?: Promise<{
    author?: string;
    mode?: string;
    paperId?: string | string[];
  }>;
};

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function IdeaGenerationPage({ searchParams }: IdeaGenerationPageProps) {
  const params = (await searchParams) ?? {};
  const session = await auth();
  const author =
    (params.author ? getAuthorByName(params.author) : null) ??
    (session?.user?.name ? getAuthorByName(session.user.name) : null);

  return (
    <IdeaGenerationClient
      authorName={author?.name ?? null}
      mode={params.mode ?? "all"}
      selectedPaperIds={asArray(params.paperId)}
    />
  );
}
