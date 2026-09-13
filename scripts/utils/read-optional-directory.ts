import { readdir } from 'node:fs/promises'

/**
 * Read directory entry names, falling back to an empty list when the directory
 * is missing.
 *
 * @param directoryPath - Path to the directory to read.
 * @returns Names of the directory entries.
 */
export async function readOptionalDirectory(
  directoryPath: string,
): Promise<string[]> {
  try {
    return await readdir(directoryPath)
  } catch {
    return []
  }
}
