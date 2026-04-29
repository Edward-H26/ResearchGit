import { IdeaWorkspace } from "@/components/idea/IdeaWorkspace";
import { env } from "@/env";
import { requireSessionUser } from "@/lib/auth/guards";
import { canvasRoomId } from "@/lib/liveblocks";
import { getIdea } from "@/server/idea-service";
import { notFound } from "next/navigation";

function describeLiveblocksKey() {
  const raw = env.LIVEBLOCKS_SECRET_KEY ?? "";
  const trimmed = raw.trim();
  const isPlaceholder = trimmed === "placeholder-liveblocks-key";
  const isConfigured = trimmed.startsWith("sk_") && trimmed.length > 10;
  let label: string;
  if (trimmed.length === 0) label = "(empty)";
  else if (isPlaceholder) label = "(placeholder default)";
  else {
    const head = trimmed.slice(0, 3);
    label = `${head}…`;
  }
  return { isConfigured, label, length: trimmed.length };
}

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser();

  const idea = await getIdea(id);
  if (!idea) notFound();

  const currentUser = {
    id: user.id,
    handle: user.name ?? user.email ?? "Anon",
  };

  const liveblocksStatus = describeLiveblocksKey();

  return (
    <IdeaWorkspace
      ideaId={idea.ideaId}
      themeLabel={idea.themeLabel}
      versions={idea.versions}
      anchorPapers={idea.anchorPapers}
      currentUser={currentUser}
      liveEnabled={liveblocksStatus.isConfigured}
      liveblocksDiagnostic={{ label: liveblocksStatus.label, length: liveblocksStatus.length }}
      roomId={canvasRoomId(idea.ideaId)}
    />
  );
}
