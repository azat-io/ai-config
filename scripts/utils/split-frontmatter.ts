/**
 * Split Markdown into frontmatter and body.
 *
 * @param content - Markdown content.
 * @returns Extracted frontmatter and body.
 */
export function splitFrontmatter(content: string): {
  frontmatter?: string
  body: string
} {
  let lines = content.split(/\r?\n/u)
  if (lines[0] !== '---') {
    return { body: content }
  }

  let endIndex = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') {
      endIndex = index
      break
    }
  }

  if (endIndex === -1) {
    return { body: content }
  }

  return {
    frontmatter: lines.slice(1, endIndex).join('\n'),
    body: lines.slice(endIndex + 1).join('\n'),
  }
}
