import { writeFile, readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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

let id = 'claude-code' as const
let name = 'Claude Code' as const
let color = 'yellow' as const

let configPath = join(homedir(), '.claude')
let hookCommandOptions = {
  localCommand: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/skill-reminder.sh',
  globalCommand: '~/.claude/hooks/skill-reminder.sh',
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
  instructions: 'CLAUDE.md',
  commands: 'commands',
  subagents: 'agents',
  skills: 'skills',
  hooks: 'hooks',
}

/**
 * Check current Claude Code configuration status.
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
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''))

    let commandsPath = join(basePath, 'commands')
    let commandFiles = await readdir(commandsPath).catch(() => [])
    status.components.commands = commandFiles
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

    let instructionsPath = join(basePath, 'CLAUDE.md')
    let instructionsContent = await readFile(instructionsPath, 'utf8').catch(
      () => '',
    )
    if (instructionsContent) {
      status.components.instructions = ['CLAUDE.md']
    }

    status.installed = true
  } catch {
    status.installed = false
  }

  return status
}

/**
 * Install Claude hooks and ensure hook configuration exists in settings.json.
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
      eventName: 'UserPromptSubmit',
      timeout: 5,
    },
  )

  await writeFile(settingsPath, merged, 'utf8')
  result.files.push(settingsPath)

  return result
}

/**
 * Resolve the absolute Claude config path.
 *
 * @returns Full filesystem path to the configuration directory.
 */
function getAbsoluteConfigPath(): string {
  return expandHome(configPath)
}

/**
 * MCP configuration handling for Claude Code adapter.
 */
let mcp = {
  merge: createMcpSettingsMergeWithHook({
    command: hookCommandOptions.globalCommand,
    eventName: 'UserPromptSubmit',
    timeout: 5,
  }),
  fileName: 'settings.json',
}

/**
 * Adapter installers for Claude Code.
 */
let installers = {
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
        eventName: 'UserPromptSubmit',
        timeout: 5,
      }),
      fileName: '.claude/settings.json',
    },
    paths: {
      commands: '.claude/commands',
      subagents: '.claude/agents',
      instructions: 'CLAUDE.md',
      skills: '.claude/skills',
      hooks: '.claude/hooks',
    },
    configPath: rootPath,
  }
}

/**
 * Adapter for Claude Code CLI.
 *
 * Installs configurations to `~/.claude/` directory:
 *
 * - `commands/*.md` - slash commands,
 * - `agents/*.md` - subagents,
 * - `skills/<name>/skill.md` - skills,
 * - `CLAUDE.md` - global instructions,
 * - `settings.json` - MCP servers (merged with existing).
 */
export let claudeCodeAdapter: Adapter = {
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
