import { isCancel } from '@clack/prompts'

/**
 * Check whether a prompt result is a cancellation.
 *
 * Prompts resolve to either a value or the cancel symbol, and this guard
 * narrows the result to the value type when the prompt was not cancelled.
 *
 * @param value - Prompt result to check.
 * @returns True when the user cancelled the prompt.
 */
export function isPromptCancelled(value: unknown): value is symbol {
  return isCancel(value)
}
