import { writeFile, readFile, readdir, rename, mkdir } from 'node:fs/promises'
import { relative, dirname, join } from 'node:path'
import { homedir } from 'node:os'

import type { AdapterInstallContext } from '../typings/adapter-install-context'
import type { ScopedConfig } from '../typings/scoped-config'
import type { McpServer } from '../typings/mcp-server'
import type { Adapter } from '../typings/adapter'
import type { Support } from '../typings/support'
import type { Result } from '../typings/result'
import type { Status } from '../typings/status'
import type { Scope } from '../typings/scope'

import { copyDirectoryContents } from '../utils/copy-directory-contents'
import { splitFrontmatter } from '../utils/split-frontmatter'
import { createResult } from '../utils/create-result'
import { expandHome } from '../utils/expand-home'

let id = 'codex' as const
let name = 'Codex' as const
let color = 'green' as const
let configPath = join(homedir(), '.codex')

let supports: Support = {
  instructions: true,
  subagents: true,
  commands: false,
  skills: true,
  hooks: false,
  mcp: true,
}

let paths = {
  instructions: 'AGENTS.md',
  subagents: 'agents',
  skills: 'skills',
}

interface CodexSubagentRole {
  description?: string
  configFile: string
  name: string
}

interface CodexSubagentWriteResult {
  destinationPath: string
  role: CodexSubagentRole
}

/**
 * Install Codex subagents by converting shared Markdown agents into Codex role
 * configs and registering them in `config.toml`.
 *
 * @param context - Installation context.
 * @returns Result with list of created files.
 */
async function installSubagents(
  context: AdapterInstallContext,
): Promise<Result> {
  let result = createResult()
  let markdownFiles = await collectMarkdownFiles(context.sourcePath)

  let writeResults = await Promise.allSettled(
    markdownFiles.map(markdownFile => writeSubagentFile(markdownFile, context)),
  )

  let roles: CodexSubagentRole[] = []
  let seenRoleNames = new Set<string>()

  for (let writeResult of writeResults) {
    if (writeResult.status === 'fulfilled') {
      result.files.push(writeResult.value.destinationPath)

      let { role } = writeResult.value
      if (seenRoleNames.has(role.name)) {
        result.success = false
        result.errors?.push(`Duplicate Codex subagent role name: ${role.name}`)
        continue
      }

      seenRoleNames.add(role.name)
      roles.push(role)
      continue
    }

    result.success = false
    result.errors?.push(
      writeResult.reason instanceof Error ?
        writeResult.reason.message
      : String(writeResult.reason),
    )
  }

  if (roles.length === 0) {
    return result
  }

  let configDirectory = dirname(context.destinationPath)
  let configFilePath = join(configDirectory, 'config.toml')
  let configContent = await readFile(configFilePath, 'utf8').catch(() => '')
  let updatedConfig = mergeCodexSubagentConfig(configContent, roles)

  await mkdir(configDirectory, { recursive: true })
  await writeFile(configFilePath, updatedConfig, 'utf8')
  result.files.push(configFilePath)

  return result
}

/**
 * Enable Codex experimental multi-agent support in `[features]`.
 *
 * @param content - Existing config.toml content.
 * @returns Updated config.toml content.
 */
function ensureMultiAgentFeatureFlag(content: string): string {
  let lines = content ? content.split(/\r?\n/u) : []
  let headerMatcher = /^\[(?<section>[^\]]+)\]\s*$/u

  let output: string[] = []
  let inFeatures = false
  let hasFeatures = false
  let hasMultiAgent = false

  for (let line of lines) {
    let headerMatch = line.match(headerMatcher)
    if (headerMatch) {
      if (inFeatures && !hasMultiAgent) {
        output.push('multi_agent = true')
        hasMultiAgent = true
      }

      let section = headerMatch.groups?.['section']
      inFeatures = section === 'features'
      if (inFeatures) {
        hasFeatures = true
      }

      output.push(line)
      continue
    }

    if (inFeatures && /^\s*multi_agent\s*=/u.test(line)) {
      if (!hasMultiAgent) {
        output.push('multi_agent = true')
        hasMultiAgent = true
      }
      continue
    }

    output.push(line)
  }

  if (inFeatures && !hasMultiAgent) {
    output.push('multi_agent = true')
  }

  if (!hasFeatures) {
    return appendTomlBlock(
      output
        .join('\n')
        .replaceAll(/\n{3,}/gu, '\n\n')
        .trimEnd(),
      ['[features]', 'multi_agent = true'].join('\n'),
    )
  }

  return output
    .join('\n')
    .replaceAll(/\n{3,}/gu, '\n\n')
    .trimEnd()
}

/**
 * Convert a shared Markdown subagent to a Codex role config file.
 *
 * @param markdownFile - Source Markdown file path.
 * @param context - Installation context.
 * @returns Generated file path and role registration details.
 */
async function writeSubagentFile(
  markdownFile: string,
  context: AdapterInstallContext,
): Promise<CodexSubagentWriteResult> {
  let relativePath = relative(context.sourcePath, markdownFile)
  let destinationPath = join(
    context.destinationPath,
    replaceExtension(relativePath, '.toml'),
  )

  let content = await readFile(markdownFile, 'utf8')
  let { frontmatter, body } = splitFrontmatter(content)
  let attributes = frontmatter ? parseFrontmatter(frontmatter) : {}

  let roleName = normalizeCodexRoleName(attributes['name'] ?? relativePath)
  let developerInstructions = body.replace(/^\r?\n/u, '').trim()
  if (!developerInstructions) {
    throw new Error(`Codex subagent "${relativePath}" has empty instructions`)
  }

  await mkdir(dirname(destinationPath), { recursive: true })
  await writeFile(
    destinationPath,
    renderCodexRoleConfig({ developerInstructions }),
    'utf8',
  )

  let configDirectory = dirname(context.destinationPath)
  let configFileRelativePath = relative(
    configDirectory,
    destinationPath,
  ).replaceAll('\\', '/')

  let description = attributes['description']?.trim()

  return {
    role: {
      configFile: configFileRelativePath,
      name: roleName,
      description,
    },
    destinationPath,
  }
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
    let agentsPath = join(basePath, 'agents')
    let agentFiles = await readdir(agentsPath).catch(() => [])
    status.components.subagents = agentFiles
      .filter(file => file.endsWith('.toml'))
      .map(file => file.replace('.toml', ''))

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
 * Parse a subset of YAML frontmatter for simple key/value pairs.
 *
 * @param frontmatter - Frontmatter content.
 * @returns Parsed key/value map.
 */
function parseFrontmatter(frontmatter: string): Record<string, string> {
  let attributes: Record<string, string> = {}
  let lines = frontmatter.split(/\r?\n/u)

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index]
    if (line === undefined) {
      continue
    }

    let separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) {
      continue
    }

    let key = line.slice(0, separatorIndex).trim()
    if (!/^[\w-]+$/u.test(key)) {
      continue
    }

    let value = line.slice(separatorIndex + 1).trim()

    if (value) {
      attributes[key] = value
      continue
    }

    let collected: string[] = []
    let nextIndex = index + 1

    while (nextIndex < lines.length) {
      let nextLine = lines[nextIndex]
      if (!nextLine || !/^\s+/u.test(nextLine)) {
        break
      }

      collected.push(nextLine.trim())
      nextIndex += 1
    }

    if (collected.length > 0) {
      attributes[key] = collected.join(' ')
      index = nextIndex - 1
    }
  }

  return attributes
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
 * Remove managed Codex role sections from config.toml content.
 *
 * @param content - Existing config.toml content.
 * @param roles - Roles that will be re-rendered.
 * @returns Content without managed role sections.
 */
function stripManagedCodexAgentRoles(
  content: string,
  roles: CodexSubagentRole[],
): string {
  let sectionNames = new Set(roles.map(role => `agents.${role.name}`))
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
 * Recursively collect markdown files from a directory.
 *
 * @param root - Directory to scan.
 * @returns Markdown file paths.
 */
async function collectMarkdownFiles(root: string): Promise<string[]> {
  let entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  let files: string[] = []
  let directories: string[] = []

  for (let entry of entries) {
    let entryPath = join(root, entry.name)

    if (entry.isDirectory()) {
      directories.push(entryPath)
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath)
    }
  }

  if (directories.length === 0) {
    return files
  }

  let nestedFiles = await Promise.all(
    directories.map(directory => collectMarkdownFiles(directory)),
  )

  return [...files, ...nestedFiles.flat()]
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
    updatedContent = appendTomlBlock(updatedContent, block)
  }

  if (updatedContent.trim().length > 0) {
    updatedContent = `${updatedContent.trimEnd()}\n`
  }

  return updatedContent
}

/**
 * Merge Codex multi-agent subagent settings into config.toml.
 *
 * @param content - Existing config.toml content.
 * @param roles - Roles to register.
 * @returns Updated config.toml content.
 */
function mergeCodexSubagentConfig(
  content: string,
  roles: CodexSubagentRole[],
): string {
  let updatedContent = ensureMultiAgentFeatureFlag(content)
  updatedContent = stripManagedCodexAgentRoles(updatedContent, roles)

  for (let role of roles) {
    updatedContent = appendTomlBlock(
      updatedContent,
      renderCodexAgentRegistration(role),
    )
  }

  return `${updatedContent.trimEnd()}\n`
}

/**
 * Normalize a shared subagent name into a Codex role name.
 *
 * @param value - Raw role name from frontmatter or file path.
 * @returns Codex-compatible role name.
 */
function normalizeCodexRoleName(value: string): string {
  let candidate = value.replaceAll('\\', '/').split('/').pop() ?? value
  let withoutExtension = candidate.replace(/\.[^./\\]+$/u, '')
  let normalized = withoutExtension
    .trim()
    .replaceAll(/\s+/gu, '-')
    .replaceAll(/[^\w-]/gu, '-')
    .replaceAll(/-+/gu, '-')
    .replaceAll(/^[-_]+|[-_]+$/gu, '')

  return normalized || 'subagent'
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
 * Render a Codex subagent registration block for `config.toml`.
 *
 * @param role - Role metadata.
 * @returns TOML block.
 */
function renderCodexAgentRegistration(role: CodexSubagentRole): string {
  let lines = [`[agents.${role.name}]`]

  if (role.description) {
    lines.push(`description = ${tomlString(role.description)}`)
  }

  lines.push(`config_file = ${tomlString(role.configFile)}`)

  return lines.join('\n')
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
function appendTomlBlock(content: string, block: string): string {
  let trimmedBlock = block.trimEnd()
  if (!content.trim()) {
    return trimmedBlock
  }

  return `${content.trimEnd()}\n\n${trimmedBlock}`
}

/**
 * Render a Codex role config TOML document.
 *
 * @param details - Developer instructions to serialize into a role config.
 * @returns TOML content.
 */
function renderCodexRoleConfig(details: {
  developerInstructions: string
}): string {
  return `developer_instructions = ${tomlMultiline(details.developerInstructions)}\n`
}

/**
 * Encode a TOML multiline string value.
 *
 * @param value - String value to encode.
 * @returns TOML multiline string literal.
 */
function tomlMultiline(value: string): string {
  let escaped = value
    .replaceAll('\\', '\\\\')
    .replaceAll('"""', String.raw`\"""`)

  return `"""${escaped}"""`
}

/**
 * Replace the extension of a file path.
 *
 * @param filePath - File path to update.
 * @param extension - New extension, including the leading dot.
 * @returns Updated path.
 */
function replaceExtension(filePath: string, extension: string): string {
  let normalized = filePath.replace(/\.[^./\\]+$/u, '')
  return `${normalized}${extension}`
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
  subagents: installSubagents,
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
      subagents: '.codex/agents',
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
 * - `agents/*.toml` - Codex multi-agent role configs,
 * - `skills/<name>/SKILL.md` - shared skills,
 * - `AGENTS.md` - global instructions,
 * - `config.toml` - MCP servers and multi-agent role registrations.
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
