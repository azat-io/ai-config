import { join } from 'node:path'

/**
 * Resolve hook command based on install scope.
 *
 * @param destinationPath - Absolute destination path for copied hook files.
 * @param basePath - Absolute adapter config root for the current installation
 *   scope.
 * @param options - Global/local command templates plus local hooks directory
 *   name.
 * @returns Command string that should be written into hook settings.
 */
export function resolveHookCommand(
  destinationPath: string,
  basePath: string,
  options: {
    localHooksDirectory: string
    globalCommand: string
    localCommand: string
  },
): string {
  if (destinationPath === join(basePath, options.localHooksDirectory)) {
    return options.globalCommand
  }

  return options.localCommand
}
