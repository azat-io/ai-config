import type { McpServer } from '../typings/mcp-server'

import { ensureCommandHook } from './ensure-command-hook'

interface MergeMcpSettingsOptions {
  /**
   * Optional additional settings mutation.
   */
  apply?(settings: Record<string, unknown>): void

  /**
   * Hook event name in settings.
   */
  eventName: string

  /**
   * Command path to execute.
   */
  command: string

  /**
   * Timeout value in agent-specific units.
   */
  timeout: number
}

/**
 * Merge MCP servers and ensure hook registration in settings.json.
 *
 * @param content - Existing settings.json content.
 * @param servers - MCP servers to merge.
 * @param options - Hook insertion and settings options.
 * @returns Updated settings.json content.
 */
export function mergeMcpSettingsWithHook(
  content: string,
  servers: Record<string, McpServer>,
  options: MergeMcpSettingsOptions,
): string {
  let settings: Record<string, unknown> = {}

  if (content.trim()) {
    settings = JSON.parse(content) as Record<string, unknown>
  }

  settings['mcpServers'] = {
    ...(settings['mcpServers'] as Record<string, unknown> | undefined),
    ...servers,
  }

  options.apply?.(settings)
  ensureCommandHook(settings, options)

  return `${JSON.stringify(settings, null, 2)}\n`
}
