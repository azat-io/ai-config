/**
 * Paths for agent-specific configuration directories.
 */
export interface AdapterPaths {
  /**
   * File name for global instructions.
   */
  instructions?: string

  /**
   * Directory for subagents.
   */
  subagents?: string

  /**
   * Directory for slash commands.
   */
  commands?: string

  /**
   * Directory for skills.
   */
  skills?: string
}
