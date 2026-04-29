import { StickyNotesBoard } from "@/components/canvas";
import { auth } from "@/lib/auth";

const STARTER_NOTES = [
  {
    id: "starter-1",
    text: "Add a co-author signal to each idea",
    x: 220,
    y: 180,
    width: 200,
    height: 140,
    intent: "add" as const,
    authorUserId: "starter",
    authorHandle: "Demo",
    rotation: -0.4,
  },
  {
    id: "starter-2",
    text: "Drop the swipe gesture, list view is enough",
    x: 600,
    y: 240,
    width: 220,
    height: 150,
    intent: "delete" as const,
    authorUserId: "starter",
    authorHandle: "Demo",
    rotation: 0.6,
  },
  {
    id: "starter-3",
    text: "Combine intent labels with reactions",
    x: 1020,
    y: 200,
    width: 200,
    height: 150,
    intent: "merge" as const,
    authorUserId: "starter",
    authorHandle: "Demo",
    rotation: -0.2,
  },
];

export default async function CanvasDemoPage() {
  const session = await auth();
  const user = {
    id: session?.user?.id ?? "anonymous-demo",
    handle: session?.user?.name ?? "You",
  };

  return <StickyNotesBoard currentUser={user} initialNotes={STARTER_NOTES} />;
}
