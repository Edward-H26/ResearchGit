export function tokenizeRecommendationText(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4),
  );
}

export function jaccardScore(left: Set<string>, right: Set<string>): number {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

export function sharedRecommendationTokens(
  left: Set<string>,
  right: Set<string>,
  limit = 3,
): string[] {
  return [...left]
    .filter((token) => right.has(token))
    .sort()
    .slice(0, limit);
}
