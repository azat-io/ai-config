import { homedir } from 'node:os'

/**
 * Expand a leading tilde to the current user's home directory.
 *
 * @param path - Path that may start with `~/`.
 * @returns Absolute path with tilde expanded.
 */
export function expandHome(path: string): string {
  let home = homedir()

  if (path === '~') {
    return home
  }

  if (path.startsWith('~/')) {
    return path.replace('~', home)
  }

  return path
}
