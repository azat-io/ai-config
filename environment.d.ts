/**
 * Environment variables available via import.meta.env.
 */
interface ImportMetaEnvironment {
  /**
   * GitHub personal access token for API authentication.
   */
  readonly GITHUB_PERSONAL_ACCESS_TOKEN: string
}

/**
 * Extended ImportMeta with typed environment variables.
 */
interface ImportMeta {
  /**
   * Typed environment variables.
   */
  readonly env: ImportMetaEnvironment
}
