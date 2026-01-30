import type { Result } from '../typings/result'

import { copyDirectoryContents } from '../utils/copy-directory-contents'
import { createResult } from '../utils/create-result'

/**
 * Copy directory contents into a target directory.
 *
 * @param sourcePath - Path to the directory that should be copied.
 * @param destinationPath - Destination directory for copied contents.
 * @returns Result with list of copied entries.
 */
export async function installDirectory(
  sourcePath: string,
  destinationPath: string,
): Promise<Result> {
  let result = createResult()
  result.files = await copyDirectoryContents(sourcePath, destinationPath)
  return result
}
