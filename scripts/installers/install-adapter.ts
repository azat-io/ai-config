import { join } from 'node:path'

import type { AdapterInstallContext } from '../typings/adapter-install-context'
import type { AdapterInstallers } from '../typings/adapter-installers'
import type { Adapter } from '../typings/adapter'
import type { Result } from '../typings/result'
import type { Source } from '../typings/source'

import { installDirectory } from './install-directory'
import { createResult } from '../utils/create-result'
import { mergeResults } from '../utils/merge-results'
import { expandHome } from '../utils/expand-home'
import { installFile } from './install-file'
import { installMcp } from './install-mcp'

/**
 * Logger interface for installer progress messages.
 */
interface InstallLogger {
  /**
   * Emit a success message.
   *
   * @param message - Message to log.
   */
  success(message: string): void

  /**
   * Emit an error message.
   *
   * @param message - Message to log.
   */
  error?(message: string): void

  /**
   * Emit a warning message.
   *
   * @param message - Message to log.
   */
  warn?(message: string): void

  /**
   * Emit an informational message.
   *
   * @param message - Message to log.
   */
  info(message: string): void
}

interface InstallAdapterOptions {
  /**
   * Custom installers for adapter components.
   */
  installers?: AdapterInstallers

  /**
   * Logger for install progress.
   */
  logger?: InstallLogger

  /**
   * Prefix to display in log messages.
   */
  label?: string
}

/**
 * Install sources using a declarative adapter definition.
 *
 * @param adapter - Target adapter definition.
 * @param sources - Source configurations to install.
 * @param options - Optional logging configuration.
 * @returns Result with list of created/modified files.
 */
export async function installAdapter(
  adapter: Adapter,
  sources: Source,
  options?: InstallAdapterOptions,
): Promise<Result> {
  let result = createResult()
  let basePath = expandHome(adapter.configPath)
  let label = options?.label ?? adapter.name
  let logger = options?.logger
  let installers = options?.installers ?? adapter.installers

  function logStart(step: string): void {
    logger?.info(`${label} ${step} installation started`)
  }

  function logComplete(step: string): void {
    logger?.success(`${label} ${step} installation completed`)
  }

  function logFailure(step: string): void {
    if (logger?.error) {
      logger.error(`${label} ${step} installation failed`)
      return
    }

    logger?.warn?.(`${label} ${step} installation failed`)
  }

  function logResult(step: string, stepResult: Result): void {
    if (stepResult.success) {
      logComplete(step)
      return
    }

    logFailure(step)
  }

  try {
    let results: Result[] = []

    if (
      adapter.supports.instructions &&
      adapter.paths.instructions &&
      sources.instructionsPath
    ) {
      let step = 'Instructions'
      logStart(step)
      let context: AdapterInstallContext = {
        destinationPath: join(basePath, adapter.paths.instructions),
        sourcePath: sources.instructionsPath,
        basePath,
        sources,
      }
      let stepResult =
        installers?.instructions ?
          await installers.instructions(context)
        : await installFile(context.sourcePath, context.destinationPath)
      results.push(stepResult)
      logResult(step, stepResult)
    }

    if (
      adapter.supports.commands &&
      adapter.paths.commands &&
      sources.commandsPath
    ) {
      let step = 'Commands'
      logStart(step)
      let context: AdapterInstallContext = {
        destinationPath: join(basePath, adapter.paths.commands),
        sourcePath: sources.commandsPath,
        basePath,
        sources,
      }
      let stepResult =
        installers?.commands ?
          await installers.commands(context)
        : await installDirectory(context.sourcePath, context.destinationPath)
      results.push(stepResult)
      logResult(step, stepResult)
    }

    if (adapter.supports.skills && adapter.paths.skills && sources.skillsPath) {
      let step = 'Skills'
      logStart(step)
      let context: AdapterInstallContext = {
        destinationPath: join(basePath, adapter.paths.skills),
        sourcePath: sources.skillsPath,
        basePath,
        sources,
      }
      let stepResult =
        installers?.skills ?
          await installers.skills(context)
        : await installDirectory(context.sourcePath, context.destinationPath)
      results.push(stepResult)
      logResult(step, stepResult)
    }

    if (
      adapter.supports.subagents &&
      adapter.paths.subagents &&
      sources.subagentsPath
    ) {
      let step = 'Subagents'
      logStart(step)
      let context: AdapterInstallContext = {
        destinationPath: join(basePath, adapter.paths.subagents),
        sourcePath: sources.subagentsPath,
        basePath,
        sources,
      }
      let stepResult =
        installers?.subagents ?
          await installers.subagents(context)
        : await installDirectory(context.sourcePath, context.destinationPath)
      results.push(stepResult)
      logResult(step, stepResult)
    }

    if (
      adapter.supports.mcp &&
      adapter.mcp &&
      Object.keys(sources.mcp).length > 0
    ) {
      let step = 'MCP'
      logStart(step)
      let stepResult = await installMcp(adapter, sources, basePath)
      results.push(stepResult)
      logResult(step, stepResult)
    }

    return mergeResults(result, ...results)
  } catch (error) {
    result.success = false
    result.errors?.push(error instanceof Error ? error.message : String(error))
    return result
  }
}
