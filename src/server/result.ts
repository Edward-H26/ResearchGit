export function requireFirstResult<T>(rows: ReadonlyArray<T>, message: string): T {
  const first = rows[0];
  if (first === undefined) {
    throw new Error(message);
  }
  return first;
}
