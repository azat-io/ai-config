import type { AdapterInstallContext } from './adapter-install-context'
import type { Result } from './result'

/**
 * Custom installers for adapter components.
 */
export interface AdapterInstallers {
  /**
   * Install global instructions.
   */
  instructions?(context: AdapterInstallContext): Promise<Result>

  /**
   * Install subagents.
   */
  subagents?(context: AdapterInstallContext): Promise<Result>

  /**
   * Install custom commands.
   */
  commands?(context: AdapterInstallContext): Promise<Result>

  /**
   * Install skills.
   */
  skills?(context: AdapterInstallContext): Promise<Result>

  /**
   * Install hooks.
   */
  hooks?(context: AdapterInstallContext): Promise<Result>
}
