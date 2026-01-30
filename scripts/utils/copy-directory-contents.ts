import { readdir, mkdir, cp } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Copy all entries from a source directory into a destination directory.
 *
 * @param sourcePath - Directory with files and subdirectories to copy.
 * @param destinationPath - Directory to receive copied contents.
 * @returns Paths of copied top-level entries in the destination directory.
 */
export async function copyDirectoryContents(
  sourcePath: string,
  destinationPath: string,
): Promise<string[]> {
  await mkdir(destinationPath, { recursive: true })

  let entries = await readdir(sourcePath, { withFileTypes: true })
  let copied: string[] = await Promise.all(
    entries.map(async entry => {
      let sourceEntryPath = join(sourcePath, entry.name)
      let destinationEntryPath = join(destinationPath, entry.name)

      await cp(sourceEntryPath, destinationEntryPath, { recursive: true })
      return destinationEntryPath
    }),
  )

  return copied
}
