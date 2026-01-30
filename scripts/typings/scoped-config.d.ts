import type { AdapterPaths } from './adapter-paths'
import type { AdapterMcp } from './adapter-mcp'

/**
 * Scoped configuration describing install paths and MCP settings.
 */
export interface ScopedConfig {
  /**
   * Relative paths for supported configuration directories.
   */
  paths: AdapterPaths

  /**
   * Base configuration directory for the scope.
   */
  configPath: string

  /**
   * MCP configuration handling for this scope.
   */
  mcp?: AdapterMcp
}
