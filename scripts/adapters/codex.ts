import { readFile, readdir, rename } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import type { AdapterInstallContext } from '../typings/adapter-install-context'
import type { ScopedConfig } from '../typings/scoped-config'
import type { McpServer } from '../typings/mcp-server'
import type { Adapter } from '../typings/adapter'
import type { Support } from '../typings/support'
import type { Result } from '../typings/result'
import type { Status } from '../typings/status'
import type { Scope } from '../typings/scope'

import { copyDirectoryContents } from '../utils/copy-directory-contents'
import { createResult } from '../utils/create-result'
import { expandHome } from '../utils/expand-home'

let id = 'codex' as const
let name = 'Codex' as const
let color = 'green' as const
let configPath = join(homedir(), '.codex')

let supports: Support = {
  instructions: true,
  subagents: false,
  commands: false,
  skills: true,
  hooks: false,
  mcp: true,
}

let paths = {
  instructions: 'AGENTS.md',
  skills: 'skills',
}

/**
 * Check current Codex configuration status.
 *
 * @returns Status with installed components.
 */
async function check(): Promise<Status> {
  let basePath = getAbsoluteConfigPath()

  let status: Status = {
    components: {
      instructions: [],
      subagents: [],
      commands: [],
      skills: [],
      hooks: [],
      mcp: [],
    },
    configPath: basePath,
    installed: false,
  }

  try {
    let skillsPath = join(basePath, 'skills')
    let skillDirectories = await readdir(skillsPath).catch(() => [])
    status.components.skills = skillDirectories

    let configFilePath = join(basePath, 'config.toml')
    let configContent = await readFile(configFilePath, 'utf8').catch(() => '')
    status.components.mcp = parseMcpServerNames(configContent)

    let instructionsPath = join(basePath, 'AGENTS.md')
    let instructionsContent = await readFile(instructionsPath, 'utf8').catch(
      () => '',
    )
    if (instructionsContent) {
      status.components.instructions = ['AGENTS.md']
    }

    status.installed = true
  } catch {
    status.installed = false
  }

  return status
}

/**
 * Install Codex skills and normalize skill filename casing.
 *
 * @param context - Installation context.
 * @returns Result with list of copied entries.
 */
async function installSkills(context: AdapterInstallContext): Promise<Result> {
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
 * Remove managed MCP sections from the content.
 *
 * @param content - Existing TOML content.
 * @param servers - MCP servers to merge.
 * @returns Cleaned TOML content without managed MCP blocks.
 */
function stripManagedMcpContent(
  content: string,
  servers: Record<string, McpServer>,
): string {
  let sectionNames = buildMcpSectionNames(servers)
  let headerMatcher = /^\[(?<section>[^\]]+)\]\s*$/u

  let cleaned: string[] = []
  let skipSection = false

  for (let line of content.split(/\r?\n/u)) {
    let headerMatch = line.match(headerMatcher)
    if (headerMatch) {
      let section = headerMatch.groups?.['section']
      skipSection = section ? sectionNames.has(section) : false
      if (!skipSection) {
        cleaned.push(line)
      }
      continue
    }

    if (skipSection) {
      continue
    }

    cleaned.push(line)
  }

  return cleaned
    .join('\n')
    .replaceAll(/\n{3,}/gu, '\n\n')
    .trimEnd()
}

/**
 * Build a TOML block for an MCP server.
 *
 * @param serverId - MCP server identifier.
 * @param config - MCP server configuration.
 * @returns TOML block for the server configuration.
 */
function renderMcpServerBlock(serverId: string, config: McpServer): string {
  let lines = [
    `[mcp_servers.${serverId}]`,
    `command = ${tomlString(config.command)}`,
    `args = ${tomlArray(config.args ?? [])}`,
  ]

  let environmentEntries = Object.entries(config.env ?? {}).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  )
  if (environmentEntries.length > 0) {
    lines.push('', `[mcp_servers.${serverId}.env]`)
    for (let [key, value] of environmentEntries) {
      lines.push(`${key} = ${tomlString(value)}`)
    }
  }

  return lines.join('\n')
}

/**
 * Merge MCP servers into Codex config.toml content.
 *
 * @param content - Existing config.toml content.
 * @param servers - MCP servers to merge.
 * @returns Updated config.toml content.
 */
function mergeMcpServers(
  content: string,
  servers: Record<string, McpServer>,
): string {
  let updatedContent = stripManagedMcpContent(content, servers)

  for (let [serverId, config] of Object.entries(servers)) {
    let block = renderMcpServerBlock(serverId, config)
    updatedContent = appendMcpServerBlock(updatedContent, block)
  }

  if (updatedContent.trim().length > 0) {
    updatedContent = `${updatedContent.trimEnd()}\n`
  }

  return updatedContent
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
 * Extract MCP server names from config.toml content.
 *
 * @param content - TOML content to scan.
 * @returns List of MCP server identifiers.
 */
function parseMcpServerNames(content: string): string[] {
  let names: string[] = []
  let matcher = /^\[mcp_servers\.(?<serverName>[^\]]+)\]/gmu

  for (let match of content.matchAll(matcher)) {
    let serverName = match.groups?.['serverName']
    if (serverName) {
      names.push(serverName)
    }
  }

  return names
}

/**
 * Build a set of MCP section names for a given server list.
 *
 * @param servers - MCP servers to register.
 * @returns Set of section names to remove before merging.
 */
function buildMcpSectionNames(servers: Record<string, McpServer>): Set<string> {
  let names = new Set<string>()

  for (let serverId of Object.keys(servers)) {
    names.add(`mcp_servers.${serverId}`)
    names.add(`mcp_servers.${serverId}.env`)
  }

  return names
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

/**
 * Append a server block to the end of the TOML document.
 *
 * @param content - Existing TOML content.
 * @param block - TOML block to append.
 * @returns Updated TOML content.
 */
function appendMcpServerBlock(content: string, block: string): string {
  let trimmedBlock = block.trimEnd()
  if (!content.trim()) {
    return trimmedBlock
  }

  return `${content.trimEnd()}\n\n${trimmedBlock}`
}

/**
 * Encode a TOML string value.
 *
 * @param value - String value to encode.
 * @returns TOML-escaped string literal.
 */
function tomlString(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`)}"`
}

/**
 * Encode a TOML array of strings.
 *
 * @param values - String values to encode.
 * @returns TOML array literal.
 */
function tomlArray(values: string[]): string {
  return `[${values.map(tomlString).join(', ')}]`
}

/**
 * Resolve the absolute Codex config path.
 *
 * @returns Full filesystem path to the configuration directory.
 */
function getAbsoluteConfigPath(): string {
  return expandHome(configPath)
}

/**
 * MCP configuration handling for Codex adapter.
 */
let mcp = {
  parse: parseMcpServerNames,
  fileName: 'config.toml',
  merge: mergeMcpServers,
}

/**
 * Adapter installers for Codex.
 */
let installers = {
  skills: installSkills,
}

/**
 * Get configuration for a specific install scope.
 *
 * @param scope - Installation scope (global or local).
 * @param rootPath - Project root path for local scope.
 * @returns Scoped configuration with paths and MCP settings.
 */
function getConfig(scope: Scope, rootPath: string): ScopedConfig {
  if (scope === 'global') {
    return {
      configPath,
      paths,
      mcp,
    }
  }

  return {
    mcp: {
      fileName: '.codex/config.toml',
      parse: parseMcpServerNames,
      merge: mergeMcpServers,
    },
    paths: {
      instructions: 'AGENTS.md',
      skills: '.codex/skills',
    },
    configPath: rootPath,
  }
}

/**
 * Adapter for Codex CLI.
 *
 * Installs configurations to `~/.codex/` directory:
 *
 * - `skills/<name>/SKILL.md` - shared skills,
 * - `AGENTS.md` - global instructions,
 * - `config.toml` - MCP servers.
 */
export let codexAdapter: Adapter = {
  installers,
  configPath,
  getConfig,
  supports,
  paths,
  check,
  color,
  name,
  mcp,
  id,
}
