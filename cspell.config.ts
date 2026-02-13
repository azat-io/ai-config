import { defineConfig } from 'cspell'

export default defineConfig({
  words: [
    'azat',
    'changelogithub',
    'modelcontextprotocol',
    'opencode',
    'todoread',
    'todowrite',
    'toolsets',
    'underspecified',
    'webfetch',
    'websearch',
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
