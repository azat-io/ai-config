import type { McpServer } from '../typings/mcp-server'

import { mergeMcpSettingsWithHook } from './merge-mcp-settings-with-hook'

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
 * Build a settings merge function with fixed hook options.
 *
 * @param options - Hook insertion and settings options.
 * @returns Adapter-compatible settings merge function.
 */
export function createMcpSettingsMergeWithHook(
  options: MergeMcpSettingsOptions,
): (content: string, servers: Record<string, McpServer>) => string {
  return (content, servers) =>
    mergeMcpSettingsWithHook(content, servers, options)
}
