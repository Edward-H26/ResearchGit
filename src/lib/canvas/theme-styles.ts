// Pastel sticky-note backgrounds for the 6 user-color tokens (Atomic Ideation
// palette). The token is assigned to a sticky after AI clustering produces
// theme groups; before clustering, themeColorToken is null and the default
// is used.

const themeBgClass: Record<string, string> = {
  "u-rose": "bg-[#FCE3DB]",
  "u-amber": "bg-[#FBE7C6]",
  "u-citron": "bg-[#F2F2C5]",
  "u-mint": "bg-[#D8EFE0]",
  "u-sky": "bg-[#D8E6F4]",
  "u-iris": "bg-[#E2DCEF]",
};

const DEFAULT_STICKY_BG = "bg-[#FFF7E6]";

export function stickyBgClass(themeColorToken: string | null): string {
  if (!themeColorToken) return DEFAULT_STICKY_BG;
  return themeBgClass[themeColorToken] ?? DEFAULT_STICKY_BG;
}

export const ALL_THEME_COLOR_TOKENS = [
  "u-rose",
  "u-amber",
  "u-citron",
  "u-mint",
  "u-sky",
  "u-iris",
] as const;
export type ThemeColorToken = (typeof ALL_THEME_COLOR_TOKENS)[number];
