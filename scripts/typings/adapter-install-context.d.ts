import type { Source } from './source'

/**
 * Installation context passed to custom installers.
 */
export interface AdapterInstallContext {
  /**
   * Destination directory path for the component.
   */
  destinationPath: string

  /**
   * Source directory path for the component.
   */
  sourcePath: string

  /**
   * Expanded adapter config path.
   */
  basePath: string

  /**
   * Source configuration paths and MCP servers.
   */
  sources: Source
}
