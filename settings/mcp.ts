import type { McpServer } from '../scripts/typings/mcp-server'

export type McpServerId = 'sequential-thinking' | 'github' | 'fetch'

/**
 * Build MCP server configuration entries.
 *
 * @param options - Configuration options for MCP server selection.
 * @param options.enabled - MCP servers to include (defaults to all).
 * @param options.githubToken - GitHub Personal Access Token for GitHub MCP.
 * @returns MCP configuration map keyed by server name.
 */
export function createMcp(options?: {
  enabled?: McpServerId[]
  githubToken?: string
}): Record<string, McpServer> {
  let enabled = new Set(
    options?.enabled ?? ['github', 'sequential-thinking', 'fetch'],
  )

  let servers: Record<string, McpServer> = {}

  if (enabled.has('github')) {
    let githubToken = options?.githubToken
    if (!githubToken) {
      throw new Error('GitHub token is required to enable GitHub MCP')
    }

    servers['github'] = {
      env: {
        GITHUB_TOOLSETS: ['repos', 'issues', 'pull_requests'].join(','),
        GITHUB_PERSONAL_ACCESS_TOKEN: githubToken,
      },
      command: 'github-mcp-server',
      args: ['stdio'],
    }
  }

  if (enabled.has('sequential-thinking')) {
    servers['sequential-thinking'] = {
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking@latest'],
      command: 'npx',
    }
  }

  if (enabled.has('fetch')) {
    servers['fetch'] = {
      args: ['mcp-server-fetch', '--ignore-robots-txt'],
      command: 'uvx',
    }
  }

  return servers
}
