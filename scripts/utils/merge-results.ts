import type { Result } from '../typings/result'

import { createResult } from './create-result'

/**
 * Combine multiple results into a single result.
 *
 * @param results - Results to merge.
 * @returns Combined result summary.
 */
export function mergeResults(...results: Result[]): Result {
  let merged = createResult()

  for (let result of results) {
    merged.files.push(...result.files)
    merged.warnings?.push(...(result.warnings ?? []))
    merged.errors?.push(...(result.errors ?? []))
    if (!result.success) {
      merged.success = false
    }
  }

  return merged
}
