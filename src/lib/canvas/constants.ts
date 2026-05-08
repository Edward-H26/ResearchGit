export const BOARD_WIDTH = 1650;
export const BOARD_HEIGHT = 1250;

export const ZOOM_MIN = 0.45;
export const ZOOM_MAX = 1.6;
export const ZOOM_DEFAULT = 0.82;
export const ZOOM_STEP_WHEEL = 0.08;

export const PAN_DEFAULT: { x: number; y: number } = { x: 60, y: 70 };

export const NOTE_DEFAULT_WIDTH = 165;
export const NOTE_DEFAULT_HEIGHT = 145;
export const NOTE_MIN_WIDTH = 90;
export const NOTE_MAX_WIDTH = 360;
export const NOTE_MIN_HEIGHT = 80;
export const NOTE_MAX_HEIGHT = 360;

export const NOTE_FALLBACK_ANCHOR = { x: 575, y: 430 } as const;
export const NOTE_FALLBACK_VARIANCE = { x: 120, y: 100 } as const;
export const NOTE_CREATE_OFFSET = { x: 80, y: 60 } as const;

export const ROTATION_RANGE = 1.2;
export const ROTATION_OFFSET = -0.6;

export function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2))));
}
