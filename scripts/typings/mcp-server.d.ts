/**
 * Configuration for an MCP server.
 */
export interface McpServer {
  /**
   * Environment variables to pass to the server.
   */
  env?: Record<string, string>
  /**
   * Command to execute the server.
   */
  command: string
  /**
   * Command line arguments.
   */
  args?: string[]
}
