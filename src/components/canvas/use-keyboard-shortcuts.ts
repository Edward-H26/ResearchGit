"use client";

import { useEffect } from "react";

export type KeyboardShortcutHandlers = {
  onEscape?: () => void;
  onDelete?: () => void;
  onRevise?: () => void;
  onResetView?: () => void;
};

function shouldIgnore(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useCanvasKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (shouldIgnore(event.target)) return;
      switch (event.key) {
        case "Escape":
          handlers.onEscape?.();
          break;
        case "Delete":
        case "Backspace":
          handlers.onDelete?.();
          break;
        case "r":
        case "R":
          if (event.metaKey || event.ctrlKey) return;
          handlers.onRevise?.();
          break;
        case "0":
          if (event.metaKey || event.ctrlKey) return;
          handlers.onResetView?.();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
