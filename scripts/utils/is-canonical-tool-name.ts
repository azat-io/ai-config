/**
 * Determine if a raw tool name is part of canonical tool names.
 *
 * @param tool - Raw tool name.
 * @param toolMap - Mapping keyed by canonical tool names.
 * @returns True when the tool has a canonical mapping.
 */
export function isCanonicalToolName<TTool extends string>(
  tool: string,
  toolMap: Record<TTool, string[]>,
): tool is TTool {
  return Object.hasOwn(toolMap, tool)
}
