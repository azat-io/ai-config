import { trimToolName } from './trim-tool-name'

/**
 * Split a comma-separated tool list.
 *
 * @param value - Raw tools value.
 * @returns Parsed tool names.
 */
export function splitToolsList(value: string): string[] {
  return value.split(',').map(trimToolName).filter(Boolean)
}
