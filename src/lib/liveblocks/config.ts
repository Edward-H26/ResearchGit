import type { StickyNote } from "@/lib/canvas/schema";
import type { LiveList } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      activeStickyId: string | null;
    };
    Storage: {
      notes: LiveList<StickyNote>;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatarUrl: string | null;
      };
    };
    RoomEvent: {
      type: "sticky.flash";
      stickyId: string;
    };
  }
}

export const LIVEBLOCKS_AUTH_ENDPOINT = "/api/liveblocks/auth";

// v2 namespace: storage migrated from plain array to LiveList<StickyNote>.
// Rooms under "canvas:<ideaId>" (v1) are orphaned and unrecoverable for live use.
const CANVAS_ROOM_VERSION = "v2";

export function canvasRoomId(ideaId: string): string {
  return `canvas:${CANVAS_ROOM_VERSION}:${ideaId}`;
}

export const DEMO_ROOM_ID = `canvas:${CANVAS_ROOM_VERSION}:demo-public`;
