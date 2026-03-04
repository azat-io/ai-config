import type { McpServer } from '../scripts/typings/mcp-server'

export type McpServerId = 'sequential-thinking' | 'fetch'

/**
 * Build MCP server configuration entries.
 *
 * @param options - Configuration options for MCP server selection.
 * @param options.enabled - MCP servers to include (defaults to all).
 * @returns MCP configuration map keyed by server name.
 */
export function createMcp(options?: {
  enabled?: McpServerId[]
}): Record<string, McpServer> {
  let enabled = new Set(options?.enabled ?? ['sequential-thinking', 'fetch'])

  let servers: Record<string, McpServer> = {}

  if (enabled.has('sequential-thinking')) {
    servers['sequential-thinking'] = {
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking@latest'],
      command: 'npx',
    }
  }

  if (enabled.has('fetch')) {
    servers['fetch'] = {
      args: ['mcp-server-fetch', '--ignore-robots-txt'],
      command: 'uvx',
    }
  }

  return servers
}
