import type { McpServer } from './mcp-server'

/**
 * Collection of all source configurations to install.
 */
export interface Source {
  /**
   * MCP server configurations.
   */
  mcp: Record<string, McpServer>

  /**
   * File containing global instructions.
   */
  instructionsPath?: string

  /**
   * Directory containing ready-to-copy subagent definitions.
   */
  subagentsPath?: string

  /**
   * Directory containing ready-to-copy slash command definitions.
   */
  commandsPath?: string

  /**
   * Directory containing ready-to-copy skill definitions.
   */
  skillsPath?: string

  /**
   * Directory containing agent-specific hook assets.
   */
  hooksPath?: string
}
