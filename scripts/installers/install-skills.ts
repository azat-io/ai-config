import { readdir, rename } from 'node:fs/promises'
import { join } from 'node:path'

import type { AdapterInstallContext } from '../typings/adapter-install-context'
import type { Result } from '../typings/result'

import { copyDirectoryContents } from '../utils/copy-directory-contents'
import { createResult } from '../utils/create-result'

/**
 * Install skills and normalize skill filename casing.
 *
 * @param context - Installation context.
 * @returns Result with list of copied entries.
 */
export async function installSkills(
  context: AdapterInstallContext,
): Promise<Result> {
  let result = createResult()
  result.files = await copyDirectoryContents(
    context.sourcePath,
    context.destinationPath,
  )

  let skillDirectories = await readdir(context.destinationPath, {
    withFileTypes: true,
  }).catch(() => [])

  let renameResults = await Promise.allSettled(
    skillDirectories
      .filter(entry => entry.isDirectory())
      .map(entry =>
        renameSkillMarkdown(join(context.destinationPath, entry.name)),
      ),
  )

  for (let renamedPath of renameResults) {
    if (renamedPath.status === 'fulfilled') {
      if (renamedPath.value) {
        result.files.push(renamedPath.value)
      }
      continue
    }

    result.success = false
    result.errors?.push(
      renamedPath.reason instanceof Error ?
        renamedPath.reason.message
      : String(renamedPath.reason),
    )
  }

  return result
}

/**
 * Rename skill.md to SKILL.md inside a skill directory.
 *
 * @param skillDirectory - Path to a skill directory.
 * @returns Updated file path when renamed.
 */
async function renameSkillMarkdown(
  skillDirectory: string,
): Promise<undefined | string> {
  let sourcePath = join(skillDirectory, 'skill.md')
  let destinationPath = join(skillDirectory, 'SKILL.md')

  try {
    await rename(sourcePath, destinationPath)
    return destinationPath
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined
    }

    throw error
  }
}

/**
 * Determine if an error represents a missing file.
 *
 * @param error - Error raised by filesystem operations.
 * @returns True when error is a missing file error.
 */
function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as { code?: string }).code === 'string' &&
    (error as { code?: string }).code === 'ENOENT'
  )
}
