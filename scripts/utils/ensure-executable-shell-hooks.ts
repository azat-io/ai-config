import { readdir, chmod } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Ensure all shell hook files are executable.
 *
 * @param rootPath - Absolute path to a hooks directory tree.
 */
export async function ensureExecutableShellHooks(
  rootPath: string,
): Promise<void> {
  let entries = await readdir(rootPath, { withFileTypes: true }).catch(() => [])

  await Promise.all(
    entries.map(async entry => {
      let entryPath = join(rootPath, entry.name)

      if (entry.isDirectory()) {
        await ensureExecutableShellHooks(entryPath)
        return
      }

      if (!entry.isFile() || !entry.name.endsWith('.sh')) {
        return
      }

      await chmod(entryPath, 0o755)
    }),
  )
}
