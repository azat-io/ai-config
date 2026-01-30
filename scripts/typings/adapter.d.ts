import type { AdapterInstallers } from './adapter-installers'
import type { AdapterPaths } from './adapter-paths'
import type { ScopedConfig } from './scoped-config'
import type { AdapterMcp } from './adapter-mcp'
import type { Support } from './support'
import type { Status } from './status'
import type { Color } from './color'
import type { Agent } from './agent'
import type { Scope } from './scope'

export interface Adapter {
  /**
   * Get configuration for a specific install scope.
   *
   * @param scope - Installation scope (global or local).
   * @param rootPath - Project root path for local scope.
   * @returns Scoped configuration with paths and MCP settings.
   */
  getConfig(scope: Scope, rootPath: string): ScopedConfig

  /**
   * Custom installers for adapter components.
   */
  installers?: AdapterInstallers

  /**
   * Check the current status of the agent's configuration.
   *
   * @returns Current agent status including installed components.
   */
  check?(): Promise<Status>

  /**
   * Relative paths for supported configuration directories.
   */
  paths: AdapterPaths

  /**
   * Base configuration directory for the agent.
   */
  configPath: string

  /**
   * Features supported by this agent.
   */
  supports: Support

  /**
   * MCP configuration handling for this agent.
   */
  mcp?: AdapterMcp

  /**
   * Color associated with this agent for logging and display purposes.
   */
  color: Color

  /**
   * Human-readable name of the agent this adapter targets.
   */
  name: string

  /**
   * Unique identifier of the agent this adapter targets.
   */
  id: Agent
}
