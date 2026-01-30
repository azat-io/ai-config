import { defineConfig } from 'cspell'

export default defineConfig({
  words: [
    'azat',
    'changelogithub',
    'modelcontextprotocol',
    'opencode',
    'toolsets',
    'underspecified',
  ],
  ignorePaths: [
    '.github',
    'changelog.md',
    'license',
    'pnpm-lock.yaml',
    'tsconfig.json',
  ],
  dictionaries: ['css', 'html', 'node', 'npm', 'typescript'],
  useGitignore: true,
  language: 'en',
})
