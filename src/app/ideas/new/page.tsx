import { IdeaGenerationClient } from "@/components/v2/IdeaGenerationClient";
import { auth } from "@/lib/auth";
import { resolvePageAuthor } from "@/lib/auth/author";

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
  const author = resolvePageAuthor(session, params.author);

  return (
    <IdeaGenerationClient
      authorName={author?.name ?? null}
      mode={params.mode ?? "all"}
      selectedPaperIds={asArray(params.paperId)}
    />
  );
}
