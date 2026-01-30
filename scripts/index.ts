import { multiselect, isCancel, password, select, log } from '@clack/prompts'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import 'node:worker_threads'
import pc from 'picocolors'

import type { AdapterInstallers } from './typings/adapter-installers'
import type { McpServerId } from '../settings/mcp'
import type { Adapter } from './typings/adapter'
import type { Source } from './typings/source'
import type { Scope } from './typings/scope'
import type { Agent } from './typings/agent'

import { installAdapter } from './installers/install-adapter'
import { claudeCodeAdapter } from './adapters/claude-code'
import { geminiCliAdapter } from './adapters/gemini-cli'
import { opencodeAdapter } from './adapters/opencode'
import { applyColor } from './utils/apply-color'
import { codexAdapter } from './adapters/codex'
import { createMcp } from '../settings/mcp'

/**
 * Run the interactive installation flow.
 */
export async function run(): Promise<void> {
  let agentOptions: {
    label: string
    value: Agent
  }[] = [
    {
      value: 'claude-code',
      label: 'Claude Code',
    },
    {
      value: 'codex',
      label: 'Codex',
    },
    {
      value: 'gemini-cli',
      label: 'Gemini CLI',
    },
    {
      value: 'opencode',
      label: 'OpenCode',
    },
  ]

  let agents = await multiselect({
    initialValues: agentOptions.map(option => option.value),
    message: 'Select agents:',
    options: agentOptions,
    required: true,
  })

  if (isCancel(agents)) {
    log.warn('Installation cancelled')
    process.exit(0)
  }

  let selectedAgents = agents

  let scope = await select<Scope>({
    options: [
      { label: 'Project (local)', value: 'local' },
      { label: 'Home (global)', value: 'global' },
    ],
    message: 'Select install scope:',
    initialValue: 'global',
  })

  if (isCancel(scope)) {
    log.warn('Installation cancelled')
    process.exit(0)
  }

  let projectRoot = resolve(process.cwd())

  function resolveIfExists(relativePath: string): undefined | string {
    let absolutePath = resolve(projectRoot, relativePath)
    return existsSync(absolutePath) ? absolutePath : undefined
  }

  let mcpOptions: {
    value: McpServerId
    label: string
  }[] = [
    { label: 'GitHub (requires token)', value: 'github' },
    { value: 'sequential-thinking', label: 'Sequential Thinking' },
    { value: 'fetch', label: 'Fetch' },
  ]

  let mcpSelection = await multiselect({
    initialValues: mcpOptions.map(option => option.value),
    message: 'Select MCP servers:',
    options: mcpOptions,
  })

  if (isCancel(mcpSelection)) {
    log.warn('Installation cancelled')
    process.exit(0)
  }

  let enabledMcp = mcpSelection
  let githubToken: undefined | string

  if (enabledMcp.includes('github')) {
    githubToken = await ensureGithubToken()
  }

  let mcpConfig = createMcp({
    enabled: enabledMcp,
    githubToken,
  })

  let sources: Source = {
    instructionsPath: resolveIfExists('instructions/global.md'),
    commandsPath: resolveIfExists('commands'),
    subagentsPath: resolveIfExists('agents'),
    skillsPath: resolveIfExists('skills'),
    mcp: mcpConfig,
  }

  let adapters: Partial<Record<Agent, Adapter>> = {
    'claude-code': claudeCodeAdapter,
    'gemini-cli': geminiCliAdapter,
    opencode: opencodeAdapter,
    codex: codexAdapter,
  }

  let installers: Partial<Record<Agent, AdapterInstallers>> = {}

  for (let agent of selectedAgents) {
    let adapter = adapters[agent]
    let adapterInstallers = installers[agent]

    if (!adapter) {
      log.error(`No adapter found for agent: ${agent}`)
      continue
    }

    let label = applyColor(adapter.color, adapter.name)
    let scopedConfig = adapter.getConfig(scope, projectRoot)
    let scopedAdapter: Adapter = {
      ...adapter,
      ...scopedConfig,
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      let result = await installAdapter(scopedAdapter, sources, {
        installers: adapterInstallers,
        logger: log,
        label,
      })

      if (!result.success) {
        log.error(`${label} Installation failed`)
        if (result.errors?.length) {
          for (let error of result.errors) {
            log.error(error)
          }
        }
        continue
      }

      let updatedFiles = result.files.length
      log.success(
        `${label} Installation completed ${pc.gray(`(${updatedFiles} files)`)}`,
      )

      if (result.warnings?.length) {
        for (let warning of result.warnings) {
          log.warn(warning)
        }
      }
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error)
      log.error(`${label} Installation failed`)
      log.error(message)
    }
  }

  log.info('All installations completed')
}

/**
 * Prompt for GitHub token until a non-empty value is provided.
 *
 * @returns Valid GitHub Personal Access Token.
 */
async function promptGithubToken(): Promise<string> {
  let token = await password({
    message: 'Enter your GitHub Personal Access Token:',
  })

  if (isCancel(token)) {
    log.warn('Installation cancelled')
    process.exit(0)
  }

  let trimmed = token.trim()
  if (trimmed.length === 0) {
    log.warn('Token cannot be empty')
    return promptGithubToken()
  }

  process.env['GITHUB_PERSONAL_ACCESS_TOKEN'] = trimmed
  return trimmed
}

/**
 * Ensure the GitHub MCP token is available before installation.
 *
 * @returns The resolved GitHub Personal Access Token.
 */
async function ensureGithubToken(): Promise<string> {
  let existingToken = process.env['GITHUB_PERSONAL_ACCESS_TOKEN']
  if (existingToken) {
    return existingToken
  }

  return promptGithubToken()
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await run()
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error)
    log.error(message)
    process.exit(1)
  }
}
