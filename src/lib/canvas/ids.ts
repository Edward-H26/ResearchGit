import { ROTATION_OFFSET, ROTATION_RANGE } from "./constants";

export function makeStickyId(random: () => number = Math.random): string {
  return `note-${random().toString(36).slice(2, 10)}`;
}

export function randomStickyRotation(random: () => number = Math.random): number {
  return Number((random() * ROTATION_RANGE + ROTATION_OFFSET).toFixed(2));
}
