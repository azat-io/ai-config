import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import type { ScopedConfig } from '../typings/scoped-config'
import type { McpServer } from '../typings/mcp-server'
import type { Adapter } from '../typings/adapter'
import type { Support } from '../typings/support'
import type { Status } from '../typings/status'
import type { Scope } from '../typings/scope'

import { expandHome } from '../utils/expand-home'

let id = 'claude-code' as const
let name = 'Claude Code' as const
let color = 'yellow' as const

let configPath = join(homedir(), '.claude')

let supports: Support = {
  instructions: true,
  subagents: true,
  commands: true,
  skills: true,
  mcp: true,
}

let paths = {
  instructions: 'CLAUDE.md',
  commands: 'commands',
  subagents: 'agents',
  skills: 'skills',
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
 * Merge MCP servers into Claude settings.json content.
 *
 * @param content - Existing settings.json content.
 * @param servers - MCP servers to merge.
 * @returns Updated settings.json content.
 */
function mergeMcpSettings(
  content: string,
  servers: Record<string, McpServer>,
): string {
  let settings: Record<string, unknown> = {}

  if (content.trim()) {
    settings = JSON.parse(content) as Record<string, unknown>
  }

  settings['mcpServers'] = {
    ...(settings['mcpServers'] as Record<string, unknown> | undefined),
    ...servers,
  }

  return `${JSON.stringify(settings, null, 2)}\n`
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
  fileName: 'settings.json',
  merge: mergeMcpSettings,
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
      commands: '.claude/commands',
      subagents: '.claude/agents',
      instructions: 'CLAUDE.md',
      skills: '.claude/skills',
    },
    mcp: {
      fileName: '.claude/settings.json',
      merge: mergeMcpSettings,
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
