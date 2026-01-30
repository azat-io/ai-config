import type { Colors } from 'picocolors/types'

/**
 * Color names supported by picocolors formatters.
 */
export type Color = {
  [Key in keyof Colors]: Colors[Key] extends (input: string) => string ? Key
  : never
}[keyof Colors]
