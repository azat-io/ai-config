/**
 * Current status of an agent's configuration.
 */
export interface Status {
  /**
   * Currently installed components.
   */
  components: {
    /**
     * Names of configured instruction files.
     */
    instructions: string[]

    /**
     * Names of installed subagent definitions.
     */
    subagents: string[]

    /**
     * Names of installed slash commands.
     */
    commands: string[]

    /**
     * Names of installed skills.
     */
    skills: string[]

    /**
     * Names of installed hooks.
     */
    hooks: string[]

    /**
     * Names of configured MCP servers.
     */
    mcp: string[]
  }

  /**
   * Path to the agent's configuration directory.
   */
  configPath?: string

  /**
   * Whether the agent is installed and available on the system.
   */
  installed: boolean
}
