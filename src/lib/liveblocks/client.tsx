"use client";

import type { StickyNote } from "@/lib/canvas/schema";
import { LiveList } from "@liveblocks/client";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { LIVEBLOCKS_AUTH_ENDPOINT } from "./config";

export type CanvasRoomProviderProps = {
  roomId: string;
  children: ReactNode;
};

function RoomLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-sm text-neutral-500">
      Connecting to live canvas…
    </div>
  );
}

export function CanvasRoomProvider({ roomId, children }: CanvasRoomProviderProps) {
  return (
    <LiveblocksProvider authEndpoint={LIVEBLOCKS_AUTH_ENDPOINT}>
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, activeStickyId: null }}
        initialStorage={{ notes: new LiveList<StickyNote>([]) }}
      >
        <ClientSideSuspense fallback={<RoomLoading />}>{children}</ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
