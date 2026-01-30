/**
 * Describes which features an agent supports.
 */
export interface Support {
  /**
   * Whether the agent supports global instructions.
   */
  instructions: boolean

  /**
   * Whether the agent supports custom subagents.
   */
  subagents: boolean

  /**
   * Whether the agent supports custom commands (slash commands).
   */
  commands: boolean

  /**
   * Whether the agent supports skills.
   */
  skills: boolean

  /**
   * Whether the agent supports MCP (Model Context Protocol) servers.
   */
  mcp: boolean
}
