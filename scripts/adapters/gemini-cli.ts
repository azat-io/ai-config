import { writeFile, readFile, readdir, mkdir } from 'node:fs/promises'
import { relative, dirname, join } from 'node:path'
import { homedir } from 'node:os'

import type { AdapterInstallContext } from '../typings/adapter-install-context'
import type { ScopedConfig } from '../typings/scoped-config'
import type { Adapter } from '../typings/adapter'
import type { Support } from '../typings/support'
import type { Result } from '../typings/result'
import type { Status } from '../typings/status'
import type { Scope } from '../typings/scope'

import { createMcpSettingsMergeWithHook } from '../utils/create-mcp-settings-merge-with-hook'
import { ensureExecutableShellHooks } from '../utils/ensure-executable-shell-hooks'
import { mergeMcpSettingsWithHook } from '../utils/merge-mcp-settings-with-hook'
import { copyDirectoryContents } from '../utils/copy-directory-contents'
import { resolveHookCommand } from '../utils/resolve-hook-command'
import { createResult } from '../utils/create-result'
import { expandHome } from '../utils/expand-home'

let id = 'gemini-cli' as const
let name = 'Gemini CLI' as const
let color = 'blue' as const
let configPath = join(homedir(), '.gemini')
let hookCommandOptions = {
  localCommand: '"$GEMINI_PROJECT_DIR"/.gemini/hooks/skill-reminder.sh',
  globalCommand: '~/.gemini/hooks/skill-reminder.sh',
  localHooksDirectory: 'hooks',
}

let supports: Support = {
  instructions: true,
  subagents: true,
  commands: true,
  skills: true,
  hooks: true,
  mcp: true,
}

let paths = {
  instructions: 'GEMINI.md',
  commands: 'commands',
  subagents: 'agents',
  skills: 'skills',
  hooks: 'hooks',
}

/**
 * Check current Gemini CLI configuration status.
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
      .filter(file => file.endsWith('.toml'))
      .map(file => file.replace('.toml', ''))

    let agentsPath = join(basePath, 'agents')
    let agentFiles = await readdir(agentsPath).catch(() => [])
    status.components.subagents = agentFiles
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''))

    let skillsPath = join(basePath, 'skills')
    let skillDirectories = await readdir(skillsPath).catch(() => [])
    status.components.skills = skillDirectories

    let hooksPath = join(basePath, 'hooks')
    let hookFiles = await readdir(hooksPath).catch(() => [])
    status.components.hooks = hookFiles
      .filter(file => file.endsWith('.sh'))
      .map(file => file.replace('.sh', ''))

    let settingsPath = join(basePath, 'settings.json')
    let settingsContent = await readFile(settingsPath, 'utf8').catch(() => '{}')
    let settings = JSON.parse(settingsContent) as {
      mcpServers?: Record<string, unknown>
    }
    if (settings.mcpServers) {
      status.components.mcp = Object.keys(settings.mcpServers)
    }

    let instructionsPath = join(basePath, 'GEMINI.md')
    let instructionsContent = await readFile(instructionsPath, 'utf8').catch(
      () => '',
    )
    if (instructionsContent) {
      status.components.instructions = ['GEMINI.md']
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
 * Install Gemini hooks and ensure hook configuration exists in settings.json.
 *
 * @param context - Installation context.
 * @returns Result with list of created/modified files.
 */
async function installHooks(context: AdapterInstallContext): Promise<Result> {
  let result = createResult()
  result.files = await copyDirectoryContents(
    context.sourcePath,
    context.destinationPath,
  )
  await ensureExecutableShellHooks(context.destinationPath)

  let settingsPath = join(dirname(context.destinationPath), 'settings.json')
  let settingsContent = await readFile(settingsPath, 'utf8').catch(() => '')
  let merged = mergeMcpSettingsWithHook(
    settingsContent,
    {},
    {
      command: resolveHookCommand(
        context.destinationPath,
        context.basePath,
        hookCommandOptions,
      ),
      apply: applyGeminiDefaults,
      eventName: 'BeforeAgent',
      timeout: 5000,
    },
  )

  await writeFile(settingsPath, merged, 'utf8')
  result.files.push(settingsPath)

  return result
}

/**
 * Install Gemini CLI subagents while removing unsupported frontmatter fields.
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
 * Install Gemini CLI commands by converting Markdown files to TOML.
 *
 * @param context - Installation context.
 * @returns Result with list of created command files.
 */
async function installCommands(
  context: AdapterInstallContext,
): Promise<Result> {
  let result = createResult()
  let markdownFiles = await collectMarkdownFiles(context.sourcePath)

  let writeResults = await Promise.allSettled(
    markdownFiles.map(markdownFile => writeCommandFile(markdownFile, context)),
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
 * Convert a single Markdown file to a TOML command file.
 *
 * @param markdownFile - Markdown file path to convert.
 * @param context - Installation context.
 * @returns Path to the created TOML file.
 */
async function writeCommandFile(
  markdownFile: string,
  context: AdapterInstallContext,
): Promise<string> {
  let relativePath = relative(context.sourcePath, markdownFile)
  let destinationPath = join(
    context.destinationPath,
    replaceExtension(relativePath, '.toml'),
  )

  let content = await readFile(markdownFile, 'utf8')
  let { description, prompt } = extractPromptDetails(content)
  let toml = renderCommandToml({ description, prompt })

  await mkdir(dirname(destinationPath), { recursive: true })
  await writeFile(destinationPath, toml, 'utf8')

  return destinationPath
}

/**
 * Split Markdown into frontmatter and body.
 *
 * @param content - Markdown content.
 * @returns Extracted frontmatter and body.
 */
function splitFrontmatter(content: string): {
  frontmatter?: string
  body: string
} {
  let lines = content.split(/\r?\n/u)
  if (lines[0] !== '---') {
    return { body: content }
  }

  let endIndex = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') {
      endIndex = index
      break
    }
  }

  if (endIndex === -1) {
    return { body: content }
  }

  return {
    frontmatter: lines.slice(1, endIndex).join('\n'),
    body: lines.slice(endIndex + 1).join('\n'),
  }
}

/**
 * Convert a single subagent Markdown file for Gemini CLI.
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

  await mkdir(dirname(destinationPath), { recursive: true })
  await writeFile(destinationPath, sanitized, 'utf8')

  return destinationPath
}

/**
 * Extract description and prompt body from a Markdown file.
 *
 * @param content - Markdown content.
 * @returns Parsed command metadata.
 */
function extractPromptDetails(content: string): {
  description?: string
  prompt: string
} {
  let { frontmatter, body } = splitFrontmatter(content)
  let attributes = frontmatter ? parseFrontmatter(frontmatter) : {}

  let prompt = body.replace(/^\r?\n/u, '')
  let { description } = attributes

  return {
    description: description?.trim() ? description.trim() : undefined,
    prompt,
  }
}

/**
 * Apply Gemini-specific default settings.
 *
 * @param settings - Parsed settings object.
 */
function applyGeminiDefaults(settings: Record<string, unknown>): void {
  let experimental =
    (
      typeof settings['experimental'] === 'object' &&
      settings['experimental'] !== null
    ) ?
      (settings['experimental'] as Record<string, unknown>)
    : {}
  settings['experimental'] = {
    ...experimental,
    enableAgents: true,
  }
}

/**
 * Render a Gemini CLI command TOML document.
 *
 * @param details - Command metadata.
 * @returns TOML content.
 */
function renderCommandToml(details: {
  description?: string
  prompt: string
}): string {
  let lines: string[] = []

  if (details.description) {
    lines.push(`description = ${tomlString(details.description)}`)
  }

  lines.push(`prompt = ${tomlMultiline(details.prompt)}`)

  return `${lines.join('\n')}\n`
}

/**
 * Encode a TOML multiline string value.
 *
 * @param value - String value to encode.
 * @returns TOML-escaped multiline string literal.
 */
function tomlMultiline(value: string): string {
  let escaped = value
    .replaceAll('\\', '\\\\')
    .replaceAll('"""', String.raw`\"""`)

  return `"""${escaped}"""`
}

/**
 * Replace the extension of a path.
 *
 * @param filePath - File path to update.
 * @param extension - New extension, including leading dot.
 * @returns Updated file path.
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
  let escaped = value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`)
  return `"${escaped}"`
}

/**
 * Remove unsupported frontmatter keys for Gemini CLI.
 *
 * @param content - Markdown content.
 * @returns Sanitized Markdown content.
 */
function stripUnsupportedFrontmatter(content: string): string {
  return stripFrontmatterKeys(content, new Set(['color']))
}

/**
 * Resolve the absolute Gemini CLI config path.
 *
 * @returns Full filesystem path to the configuration directory.
 */
function getAbsoluteConfigPath(): string {
  return expandHome(configPath)
}

/**
 * MCP configuration for Gemini CLI.
 */
let mcp = {
  merge: createMcpSettingsMergeWithHook({
    command: hookCommandOptions.globalCommand,
    apply: applyGeminiDefaults,
    eventName: 'BeforeAgent',
    timeout: 5000,
  }),
  fileName: 'settings.json',
}

/**
 * Adapter installers for Gemini CLI.
 */
let installers = {
  subagents: installSubagents,
  commands: installCommands,
  hooks: installHooks,
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
      merge: createMcpSettingsMergeWithHook({
        command: hookCommandOptions.localCommand,
        apply: applyGeminiDefaults,
        eventName: 'BeforeAgent',
        timeout: 5000,
      }),
      fileName: '.gemini/settings.json',
    },
    paths: {
      commands: '.gemini/commands',
      subagents: '.gemini/agents',
      instructions: 'GEMINI.md',
      skills: '.gemini/skills',
      hooks: '.gemini/hooks',
    },
    configPath: rootPath,
  }
}

/**
 * Adapter for Gemini CLI.
 *
 * Installs configurations to `~/.gemini/` directory:
 *
 * - `commands/` - custom commands,
 * - `agents/` - subagents,
 * - `skills/` - skills,
 * - `GEMINI.md` - global instructions,
 * - `settings.json` - MCP servers and experimental flags (merged with existing).
 */
export let geminiCliAdapter: Adapter = {
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
