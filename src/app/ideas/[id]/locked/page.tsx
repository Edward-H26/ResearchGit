import { redirect } from "next/navigation";

type LockedIdeaPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    author?: string;
  }>;
};

export default async function LockedIdeaPage({ params, searchParams }: LockedIdeaPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const authorQuery = query.author ? `?author=${encodeURIComponent(query.author)}` : "";

  redirect(`/ideas/${id}${authorQuery}`);
}
