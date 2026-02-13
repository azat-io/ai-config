/**
 * Check whether a value is a plain object.
 *
 * @param value - Value to check.
 * @returns True when the value is a non-null object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
