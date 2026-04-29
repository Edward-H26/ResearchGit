"use client";

import { cn } from "@/lib/utils";

export const REACTION_EMOJIS = ["👍", "👎", "🎯", "💡", "⚠️", "❓"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type StickyReactionsProps = {
  reactions: Record<string, ReadonlyArray<string>> | undefined;
  currentUserId: string;
  onToggle: (emoji: ReactionEmoji) => void;
  compact?: boolean;
};

export function StickyReactions({
  reactions,
  currentUserId,
  onToggle,
  compact = false,
}: StickyReactionsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 shadow",
        compact ? "text-[11px]" : "text-xs",
      )}
    >
      {REACTION_EMOJIS.map((emoji) => {
        const reactors = reactions?.[emoji] ?? [];
        const mine = reactors.includes(currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(emoji);
            }}
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 transition",
              mine ? "bg-neutral-900 text-white" : "hover:bg-neutral-100",
            )}
            aria-label={`Toggle ${emoji} reaction`}
          >
            <span aria-hidden="true">{emoji}</span>
            {reactors.length > 0 && (
              <span className={cn("font-medium", mine ? "text-white" : "text-neutral-600")}>
                {reactors.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
