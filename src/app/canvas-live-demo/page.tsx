import { LiveStickyNotesBoard } from "@/components/canvas";
import { requireSessionUser } from "@/lib/auth/guards";
import { CanvasRoomProvider, DEMO_ROOM_ID } from "@/lib/liveblocks";
import { Suspense } from "react";

export default async function CanvasLiveDemoPage() {
  const sessionUser = await requireSessionUser();
  const user = {
    id: sessionUser.id,
    handle: sessionUser.name ?? sessionUser.email ?? sessionUser.id,
  };

  return (
    <CanvasRoomProvider roomId={DEMO_ROOM_ID}>
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-neutral-100">
            <p className="text-sm text-neutral-500">Connecting to live canvas...</p>
          </main>
        }
      >
        <LiveStickyNotesBoard currentUser={user} />
      </Suspense>
    </CanvasRoomProvider>
  );
}
