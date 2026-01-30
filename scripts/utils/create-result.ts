import type { Result } from '../typings/result'

/**
 * Create a successful, empty result object.
 *
 * @returns Empty result with success=true.
 */
export function createResult(): Result {
  return {
    success: true,
    warnings: [],
    errors: [],
    files: [],
  }
}
