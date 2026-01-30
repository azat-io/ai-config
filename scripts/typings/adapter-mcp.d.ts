import type { McpServer } from './mcp-server'

/**
 * MCP configuration handling for an adapter.
 */
export interface AdapterMcp {
  /**
   * Merge MCP servers into existing content.
   *
   * @param content - Existing configuration file contents.
   * @param servers - MCP servers to merge.
   * @returns Updated configuration contents.
   */
  merge(content: string, servers: Record<string, McpServer>): string

  /**
   * Parse MCP server names from configuration content.
   *
   * @param content - Existing configuration file contents.
   * @returns List of MCP server identifiers.
   */
  parse?(content: string): string[]

  /**
   * MCP configuration file name inside the config path.
   */
  fileName: string
}
