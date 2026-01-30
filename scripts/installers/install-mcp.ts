import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Adapter } from '../typings/adapter'
import type { Result } from '../typings/result'
import type { Source } from '../typings/source'

import { createResult } from '../utils/create-result'

/**
 * Merge MCP servers into the adapter-specific configuration file.
 *
 * @param adapter - Target adapter definition.
 * @param sources - Source configurations to install.
 * @param basePath - Absolute path to the adapter configuration directory.
 * @returns Result with MCP configuration file if modified.
 */
export async function installMcp(
  adapter: Adapter,
  sources: Source,
  basePath: string,
): Promise<Result> {
  let result = createResult()

  if (!adapter.mcp || Object.keys(sources.mcp).length === 0) {
    return result
  }

  await mkdir(basePath, { recursive: true })

  let configPath = join(basePath, adapter.mcp.fileName)
  let existingContent = await readFile(configPath, 'utf8').catch(() => '')
  let updatedContent = adapter.mcp.merge(existingContent, sources.mcp)

  await writeFile(configPath, updatedContent, 'utf8')
  result.files.push(configPath)

  return result
}
