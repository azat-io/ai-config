import type { Dirent } from 'node:fs'

import { readdir } from 'node:fs/promises'

/**
 * Read directory entries with their file types, falling back to an empty list
 * when the directory is missing.
 *
 * @param directoryPath - Path to the directory to read.
 * @returns Directory entries with file type information.
 */
export async function readOptionalDirectoryEntries(
  directoryPath: string,
): Promise<Dirent[]> {
  try {
    return await readdir(directoryPath, { withFileTypes: true })
  } catch {
    return []
  }
}
