import { TopicCanvasClient } from "@/components/v2/TopicCanvasClient";
import { auth } from "@/lib/auth";
import { resolvePageAuthor } from "@/lib/auth/author";

type TopicPaperCanvasPageProps = {
  params: Promise<{
    id: string;
    paperId: string;
  }>;
  searchParams?: Promise<{
    author?: string;
  }>;
};

export default async function TopicPaperCanvasPage({
  params,
  searchParams,
}: TopicPaperCanvasPageProps) {
  const { id, paperId } = await params;
  const query = (await searchParams) ?? {};
  const session = await auth();
  const author = resolvePageAuthor(session, query.author);

  return <TopicCanvasClient topicId={id} viewerName={author?.name ?? null} paperId={paperId} />;
}
