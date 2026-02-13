/**
 * Trim a raw tool name and remove quotes.
 *
 * @param value - Raw tool name.
 * @returns Normalized tool name.
 */
export function trimToolName(value: string): string {
  let normalized = value.trim()
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1).trim()
  }

  return normalized
}
