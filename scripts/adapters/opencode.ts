import {
  writeFile,
  copyFile,
  readFile,
  readdir,
  rename,
  mkdir,
} from 'node:fs/promises'
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
import type { Tool } from '../typings/tool'

import { extractToolsFromFrontmatter } from '../utils/extract-tools-from-frontmatter'
import { copyDirectoryContents } from '../utils/copy-directory-contents'
import { isCanonicalToolName } from '../utils/is-canonical-tool-name'
import { splitFrontmatter } from '../utils/split-frontmatter'
import { createResult } from '../utils/create-result'
import { expandHome } from '../utils/expand-home'
import { isRecord } from '../utils/is-record'

let id = 'opencode' as const
let name = 'OpenCode' as const
let color = 'magenta' as const
let configPath = join(homedir(), '.config', 'opencode')

let supports: Support = {
  instructions: true,
  subagents: true,
  commands: true,
  skills: true,
  hooks: false,
  mcp: true,
}

let paths = {
  instructions: 'AGENTS.md',
  commands: 'commands',
  subagents: 'agents',
  skills: 'skill',
}

let toolMap: Record<Tool, string[]> = {
  WebSearch: ['websearch'],
  WebFetch: ['webfetch'],
  MultiEdit: ['edit'],
  Write: ['write'],
  Bash: ['bash'],
  Edit: ['edit'],
  Glob: ['glob'],
  Grep: ['grep'],
  Read: ['read'],
  LS: ['list'],
}

let openCodeBuiltinTools = [
  'bash',
  'edit',
  'glob',
  'grep',
  'list',
  'lsp',
  'patch',
  'question',
  'read',
  'skill',
  'todoread',
  'todowrite',
  'webfetch',
  'websearch',
  'write',
]
let openCodeBuiltinToolSet = new Set<string>(openCodeBuiltinTools)

/**
 * Check current OpenCode configuration status.
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
    let commandsPath = join(basePath, 'commands')
    let commandFiles = await readdir(commandsPath).catch(() => [])
    status.components.commands = commandFiles
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''))

    let agentsPath = join(basePath, 'agents')
    let agentFiles = await readdir(agentsPath).catch(() => [])
    status.components.subagents = agentFiles
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''))

    let skillsPath = join(basePath, 'skill')
    let skillDirectories = await readdir(skillsPath).catch(() => [])
    status.components.skills = skillDirectories

    let settingsPath = join(basePath, 'opencode.json')
    let settingsContent = await readFile(settingsPath, 'utf8').catch(() => '')
    let settings = parseJsonc(settingsContent)
    if (isRecord(settings['mcp'])) {
      status.components.mcp = Object.keys(settings['mcp'])
    }

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
 * Strip specified keys from frontmatter, if present.
 *
 * @param content - Markdown content.
 * @param keys - Keys to remove from frontmatter.
 * @returns Sanitized Markdown content.
 */
function stripFrontmatterKeys(content: string, keys: Set<string>): string {
  let lines = content.split(/\r?\n/u)

  if (lines[0] !== '---') {
    return content
  }

  let endIndex = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') {
      endIndex = index
      break
    }
  }

  if (endIndex === -1) {
    return content
  }

  let filtered: string[] = []

  for (let index = 1; index < endIndex; index += 1) {
    let line = lines[index]
    if (line === undefined) {
      continue
    }

    let separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) {
      filtered.push(line)
      continue
    }

    let key = line.slice(0, separatorIndex).trim()
    if (!keys.has(key)) {
      filtered.push(line)
      continue
    }

    let value = line.slice(separatorIndex + 1).trim()
    if (!value) {
      while (index + 1 < endIndex) {
        let nextLine = lines[index + 1]
        if (!nextLine || !/^\s+/u.test(nextLine)) {
          break
        }
        index += 1
      }
    }
  }

  if (filtered.length === 0) {
    return lines.slice(endIndex + 1).join('\n')
  }

  return ['---', ...filtered, '---', ...lines.slice(endIndex + 1)].join('\n')
}

/**
 * Remove JSON comments from a string while preserving string literals.
 *
 * @param input - JSONC content.
 * @returns JSON without comments.
 */
function stripJsonComments(input: string): string {
  let result = ''
  let inString = false
  let stringDelimiter = ''
  let escaped = false

  for (let index = 0; index < input.length; index += 1) {
    let char = input[index]
    let next = input[index + 1]

    if (inString) {
      result += char
      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
      } else if (char === stringDelimiter) {
        inString = false
      }

      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringDelimiter = char
      result += char
      continue
    }

    if (char === '/' && next === '/') {
      while (index < input.length && input[index] !== '\n') {
        index += 1
      }
      result += '\n'
      continue
    }

    if (char === '/' && next === '*') {
      index += 2
      while (
        index < input.length &&
        (input[index] !== '*' || input[index + 1] !== '/')
      ) {
        index += 1
      }
      index += 1
      continue
    }

    result += char
  }

  return result
}

/**
 * Remove trailing commas from JSON content.
 *
 * @param input - JSON content.
 * @returns JSON content without trailing commas.
 */
function removeTrailingCommas(input: string): string {
  let result = ''
  let inString = false
  let stringDelimiter = ''
  let escaped = false

  for (let index = 0; index < input.length; index += 1) {
    let char = input[index]

    if (inString) {
      result += char
      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
      } else if (char === stringDelimiter) {
        inString = false
      }

      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringDelimiter = char
      result += char
      continue
    }

    if (char === ',') {
      let lookahead = index + 1
      while (lookahead < input.length && /\s/u.test(input[lookahead] ?? '')) {
        lookahead += 1
      }

      let nextNonWhitespace = input[lookahead]
      if (nextNonWhitespace === '}' || nextNonWhitespace === ']') {
        continue
      }
    }

    result += char
  }

  return result
}

/**
 * Install OpenCode skills and normalize skill filename casing.
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
 * Install OpenCode global instructions and register them in opencode.json.
 *
 * @param context - Installation context.
 * @returns Result with list of created/modified files.
 */
async function installInstructions(
  context: AdapterInstallContext,
): Promise<Result> {
  let result = createResult()

  await mkdir(dirname(context.destinationPath), { recursive: true })
  await copyFile(context.sourcePath, context.destinationPath)
  result.files.push(context.destinationPath)

  let settingsPath = join(context.basePath, 'opencode.json')
  let settingsContent = await readFile(settingsPath, 'utf8').catch(() => '')
  let settings = parseJsonc(settingsContent)
  let instructions = normalizeInstructionList(settings['instructions'])

  if (!instructions.includes(context.destinationPath)) {
    instructions.push(context.destinationPath)
  }

  settings['instructions'] = instructions

  await writeFile(
    settingsPath,
    `${JSON.stringify(settings, null, 2)}\n`,
    'utf8',
  )
  result.files.push(settingsPath)

  return result
}

/**
 * Convert MCP server definitions into OpenCode config entries.
 *
 * @param servers - MCP servers to convert.
 * @returns OpenCode MCP configuration entries.
 */
function renderMcpServers(
  servers: Record<string, McpServer>,
): Record<string, unknown> {
  let entries: Record<string, unknown> = {}

  for (let [serverId, server] of Object.entries(servers)) {
    let entry: Record<string, unknown> = {
      command: [server.command, ...(server.args ?? [])],
      type: 'local',
      enabled: true,
    }

    let environmentEntries = Object.entries(server.env ?? {}).filter(
      (environmentEntry): environmentEntry is [string, string] =>
        typeof environmentEntry[1] === 'string',
    )

    if (environmentEntries.length > 0) {
      entry['environment'] = Object.fromEntries(environmentEntries)
    }

    entries[serverId] = entry
  }

  return entries
}

/**
 * Install OpenCode subagents while removing unsupported frontmatter fields.
 *
 * @param context - Installation context.
 * @returns Result with list of created subagent files.
 */
async function installSubagents(
  context: AdapterInstallContext,
): Promise<Result> {
  let result = createResult()
  let markdownFiles = await collectMarkdownFiles(context.sourcePath)

  let writeResults = await Promise.allSettled(
    markdownFiles.map(markdownFile => writeSubagentFile(markdownFile, context)),
  )

  for (let writeResult of writeResults) {
    if (writeResult.status === 'fulfilled') {
      result.files.push(writeResult.value)
      continue
    }

    result.success = false
    result.errors?.push(
      writeResult.reason instanceof Error ?
        writeResult.reason.message
      : String(writeResult.reason),
    )
  }

  return result
}

/**
 * Recursively collect markdown files from a directory.
 *
 * @param root - Directory to scan for markdown files.
 * @returns List of markdown file paths.
 */
async function collectMarkdownFiles(root: string): Promise<string[]> {
  let entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  let files: string[] = []
  let directories: string[] = []

  for (let entry of entries) {
    let entryPath = join(root, entry.name)

    if (entry.isDirectory()) {
      directories.push(entryPath)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
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
 * Normalize `tools` frontmatter for OpenCode.
 *
 * @param content - Markdown content.
 * @returns Markdown content with OpenCode-compatible tools map.
 */
function normalizeSubagentToolsForOpenCode(content: string): string {
  let { frontmatter, body } = splitFrontmatter(content)
  if (!frontmatter) {
    return content
  }

  let { lines, tools } = extractToolsFromFrontmatter(frontmatter)
  if (!tools) {
    return content
  }

  let enabledTools = mapToolsToOpenCode(tools)
  lines.push('tools:')

  for (let tool of openCodeBuiltinTools) {
    lines.push(`  ${tool}: ${enabledTools.has(tool)}`)
  }

  for (let tool of enabledTools) {
    if (openCodeBuiltinToolSet.has(tool)) {
      continue
    }

    lines.push(`  ${tool}: true`)
  }

  return ['---', ...lines, '---', body].join('\n')
}

/**
 * Convert a single subagent Markdown file for OpenCode.
 *
 * @param markdownFile - Markdown file path to convert.
 * @param context - Installation context.
 * @returns Path to the created subagent file.
 */
async function writeSubagentFile(
  markdownFile: string,
  context: AdapterInstallContext,
): Promise<string> {
  let relativePath = relative(context.sourcePath, markdownFile)
  let destinationPath = join(context.destinationPath, relativePath)

  let content = await readFile(markdownFile, 'utf8')
  let sanitized = stripUnsupportedFrontmatter(content)
  sanitized = normalizeSubagentToolsForOpenCode(sanitized)

  await mkdir(dirname(destinationPath), { recursive: true })
  await writeFile(destinationPath, sanitized, 'utf8')

  return destinationPath
}

/**
 * Convert canonical Claude-style tool names to OpenCode tool names.
 *
 * @param tools - Tool names from source frontmatter.
 * @returns Enabled OpenCode tool set.
 */
function mapToolsToOpenCode(tools: string[]): Set<string> {
  let enabledTools = new Set<string>()

  for (let tool of tools) {
    if (!tool || /^Task(?:\(|$)/u.test(tool)) {
      continue
    }

    let mappedTools =
      isCanonicalToolName(tool, toolMap) ? toolMap[tool] : [tool]
    for (let mappedTool of mappedTools) {
      enabledTools.add(mappedTool)
    }
  }

  return enabledTools
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
 * Merge MCP servers into OpenCode opencode.json content.
 *
 * @param content - Existing opencode.json content.
 * @param servers - MCP servers to merge.
 * @returns Updated opencode.json content.
 */
function mergeMcpSettings(
  content: string,
  servers: Record<string, McpServer>,
): string {
  let config = parseJsonc(content)
  let existingMcp = isRecord(config['mcp']) ? config['mcp'] : {}
  let mergedMcp = {
    ...existingMcp,
    ...renderMcpServers(servers),
  }

  config['mcp'] = mergedMcp

  return `${JSON.stringify(config, null, 2)}\n`
}

/**
 * Normalize an instructions value into a list of paths.
 *
 * @param value - Raw instructions value.
 * @returns Instruction path list.
 */
function normalizeInstructionList(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }

  return []
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
 * Parse JSON/JSONC content into an object.
 *
 * @param content - JSON or JSONC content.
 * @returns Parsed configuration object.
 */
function parseJsonc(content: string): Record<string, unknown> {
  if (!content.trim()) {
    return {}
  }

  let sanitized = removeTrailingCommas(stripJsonComments(content))
  return JSON.parse(sanitized) as Record<string, unknown>
}

/**
 * Remove unsupported frontmatter keys for OpenCode.
 *
 * @param content - Markdown content.
 * @returns Sanitized Markdown content.
 */
function stripUnsupportedFrontmatter(content: string): string {
  return stripFrontmatterKeys(content, new Set(['color']))
}

/**
 * Resolve the absolute OpenCode config path.
 *
 * @returns Full filesystem path to the configuration directory.
 */
function getAbsoluteConfigPath(): string {
  return expandHome(configPath)
}

/**
 * MCP configuration handling for OpenCode.
 */
let mcp = {
  fileName: 'opencode.json',
  merge: mergeMcpSettings,
}

/**
 * Installer functions for OpenCode adapter.
 */
let installers = {
  instructions: installInstructions,
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
    paths: {
      commands: '.opencode/commands',
      subagents: '.opencode/agents',
      instructions: 'AGENTS.md',
      skills: '.opencode/skill',
    },
    mcp: {
      fileName: 'opencode.json',
      merge: mergeMcpSettings,
    },
    configPath: rootPath,
  }
}

/**
 * Adapter for OpenCode CLI.
 *
 * Installs configurations to `~/.config/opencode/` directory:
 *
 * - `commands/` - custom commands,
 * - `agents/` - subagents,
 * - `skill/` - skills (singular directory name),
 * - `AGENTS.md` - global instructions,
 * - `opencode.json` - MCP servers (merged with existing).
 */
export let opencodeAdapter: Adapter = {
  configPath,
  installers,
  getConfig,
  supports,
  paths,
  check,
  color,
  name,
  mcp,
  id,
}
