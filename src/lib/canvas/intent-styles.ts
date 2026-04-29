import type { StickyIntent } from "./schema";

export const intentBgClass: Record<StickyIntent, string> = {
  add: "bg-emerald-300 shadow-emerald-900/20",
  delete: "bg-red-300 shadow-red-900/20",
  merge: "bg-violet-300 shadow-violet-900/20",
};

export const intentSwatchClass: Record<StickyIntent, string> = {
  add: "bg-emerald-300",
  delete: "bg-red-300",
  merge: "bg-violet-300",
};

export const intentLabel: Record<StickyIntent, string> = {
  add: "Add",
  delete: "Delete",
  merge: "Merge",
};

export const intentList: ReadonlyArray<StickyIntent> = ["add", "delete", "merge"];
