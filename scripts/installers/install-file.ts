import { copyFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { Result } from '../typings/result'

import { createResult } from '../utils/create-result'

/**
 * Copy a single file into a target location.
 *
 * @param sourcePath - Path to the file that should be copied.
 * @param destinationPath - Destination path for the copied file.
 * @returns Result with list of copied entries.
 */
export async function installFile(
  sourcePath: string,
  destinationPath: string,
): Promise<Result> {
  let result = createResult()

  await mkdir(dirname(destinationPath), { recursive: true })
  await copyFile(sourcePath, destinationPath)

  result.files.push(destinationPath)
  return result
}
