import { TopicCanvasClient } from "@/components/v2/TopicCanvasClient";
import { auth } from "@/lib/auth";
import { resolvePageAuthor } from "@/lib/auth/author";

type TopicCanvasPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    author?: string;
    paper?: string;
  }>;
};

export default async function TopicCanvasPage({ params, searchParams }: TopicCanvasPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const session = await auth();
  const author = resolvePageAuthor(session, query.author);

  return (
    <TopicCanvasClient
      topicId={id}
      viewerName={author?.name ?? null}
      paperId={query.paper ?? null}
    />
  );
}
