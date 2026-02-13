import { isRecord } from './is-record'

interface EnsureCommandHookOptions {
  /**
   * Hook event name in settings.
   */
  eventName: string

  /**
   * Command path to execute.
   */
  command: string

  /**
   * Timeout value in agent-specific units.
   */
  timeout: number
}

/**
 * Ensure command hook is present for a specific event.
 *
 * @param settings - Parsed settings object.
 * @param options - Hook insertion options.
 */
export function ensureCommandHook(
  settings: Record<string, unknown>,
  options: EnsureCommandHookOptions,
): void {
  let hooks = isRecord(settings['hooks']) ? settings['hooks'] : {}
  let existingGroups = hooks[options.eventName]
  let groups: unknown[] = Array.isArray(existingGroups) ? existingGroups : []

  let hasHook = groups.some(group => {
    if (!isRecord(group) || !Array.isArray(group['hooks'])) {
      return false
    }

    return group['hooks'].some(
      hook =>
        isRecord(hook) &&
        hook['type'] === 'command' &&
        hook['command'] === options.command,
    )
  })

  if (!hasHook) {
    groups.push({
      hooks: [
        {
          timeout: options.timeout,
          command: options.command,
          type: 'command',
        },
      ],
    })
  }

  hooks[options.eventName] = groups
  settings['hooks'] = hooks
}
