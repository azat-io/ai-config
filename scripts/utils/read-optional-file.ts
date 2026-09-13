import { readFile } from 'node:fs/promises'

/**
 * Read a text file, falling back to a default value when it is missing.
 *
 * @param filePath - Path to the file to read.
 * @param fallback - Value to return when the file cannot be read.
 * @returns File content or the fallback value.
 */
export async function readOptionalFile(
  filePath: string,
  fallback = '',
): Promise<string> {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return fallback
  }
}
