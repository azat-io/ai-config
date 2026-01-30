import type { Colors } from 'picocolors/types'

import pc from 'picocolors'

import type { Color } from '../typings/color'

let colors: Colors = pc

/**
 * Apply color formatting to a string.
 *
 * @param color - Color name.
 * @param value - String to format.
 * @returns Colored string.
 */
export function applyColor(color: Color, value: string): string {
  let formatter = colors[color]
  return typeof formatter === 'function' ? formatter(value) : value
}
