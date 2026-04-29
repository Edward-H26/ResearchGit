"use client";

import { LiveStickyNotesBoard, StickyNotesBoard } from "@/components/canvas";
import { IdeaPaneLeft } from "@/components/idea/IdeaPaneLeft";
import type { StickyNote } from "@/lib/canvas/schema";
import type { CanvasUser } from "@/lib/canvas/types";
import type { AnchorPaperSummary, IdeaVersionRow } from "@/lib/idea/contracts";
import { CanvasRoomProvider } from "@/lib/liveblocks";
import { useState } from "react";

export type IdeaWorkspaceProps = {
  ideaId: string;
  themeLabel: string;
  versions: ReadonlyArray<IdeaVersionRow>;
  anchorPapers: ReadonlyArray<AnchorPaperSummary>;
  currentUser: CanvasUser;
  liveEnabled: boolean;
  liveblocksDiagnostic: { label: string; length: number };
  roomId: string;
};

export function IdeaWorkspace(props: IdeaWorkspaceProps) {
  const [currentNotes, setCurrentNotes] = useState<ReadonlyArray<StickyNote>>([]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="w-[420px] shrink-0">
        <IdeaPaneLeft
          ideaId={props.ideaId}
          themeLabel={props.themeLabel}
          versions={props.versions}
          anchorPapers={props.anchorPapers}
          currentNotes={currentNotes}
        />
      </div>
      <div className="relative flex-1">
        {!props.liveEnabled && (
          <div className="absolute right-5 top-5 z-30 max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-lg">
            <p className="font-semibold">Single-user mode</p>
            <p className="mt-1 leading-relaxed">
              Liveblocks isn’t configured. Set{" "}
              <code className="rounded bg-amber-100 px-1">LIVEBLOCKS_SECRET_KEY</code> (sk_dev_… or
              sk_prod_…) in <code className="rounded bg-amber-100 px-1">.env</code> and restart the
              dev server to enable real-time collaboration.
            </p>
            <p className="mt-2 border-t border-amber-200 pt-2 text-[10px] uppercase tracking-wider">
              Detected key:{" "}
              <span className="font-mono normal-case">{props.liveblocksDiagnostic.label}</span> ·
              length {props.liveblocksDiagnostic.length}
            </p>
          </div>
        )}
        {props.liveEnabled ? (
          <CanvasRoomProvider roomId={props.roomId}>
            <LiveStickyNotesBoard currentUser={props.currentUser} onNotesChange={setCurrentNotes} />
          </CanvasRoomProvider>
        ) : (
          <StickyNotesBoard currentUser={props.currentUser} onChange={setCurrentNotes} />
        )}
      </div>
    </div>
  );
}
