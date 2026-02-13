import { splitToolsList } from './split-tools-list'
import { trimToolName } from './trim-tool-name'

/**
 * Extract tools from YAML frontmatter while preserving other lines.
 *
 * @param frontmatter - YAML frontmatter content without fences.
 * @returns Frontmatter lines without tools and parsed tools (if present).
 */
export function extractToolsFromFrontmatter(frontmatter: string): {
  tools?: string[]
  lines: string[]
} {
  let lines = frontmatter.split(/\r?\n/u)
  let normalizedLines: string[] = []
  let parsedTools: undefined | string[]

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index]
    if (line === undefined) {
      continue
    }

    let separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) {
      normalizedLines.push(line)
      continue
    }

    let key = line.slice(0, separatorIndex).trim()
    if (key !== 'tools') {
      normalizedLines.push(line)
      continue
    }

    let value = line.slice(separatorIndex + 1).trim()
    parsedTools = []

    if (value) {
      parsedTools.push(...splitToolsList(value))
      continue
    }

    while (index + 1 < lines.length) {
      let nextLine = lines[index + 1]
      if (!nextLine || !/^\s+/u.test(nextLine)) {
        break
      }

      index += 1
      let trimmed = nextLine.trim()
      if (trimmed.startsWith('-')) {
        let item = trimToolName(trimmed.replace(/^-+\s*/u, ''))
        if (item) {
          parsedTools.push(item)
        }
        continue
      }

      parsedTools.push(...splitToolsList(trimmed))
    }
  }

  return {
    lines: normalizedLines,
    tools: parsedTools,
  }
}
