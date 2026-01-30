/**
 * Result of an installation operation.
 */
export interface Result {
  /**
   * Warning messages for non-critical issues.
   */
  warnings?: string[]

  /**
   * Error messages if installation failed.
   */
  errors?: string[]

  /**
   * Whether the installation completed successfully.
   */
  success: boolean

  /**
   * List of files that were created or modified.
   */
  files: string[]
}
