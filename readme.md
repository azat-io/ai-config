# AI Config

<img
  src="https://raw.githubusercontent.com/azat-io/ai-config/main/assets/logo.svg"
  alt="AI Config Logo"
  align="right"
  height="160"
  width="160"
/>

[![Version](https://img.shields.io/npm/v/@azat-io/ai-config.svg?color=fff&labelColor=fc60bc)](https://npmjs.com/package/@azat-io/ai-config)
[![GitHub License](https://img.shields.io/badge/license-MIT-232428.svg?color=fff&labelColor=fc60bc)](https://github.com/azat-io/ai-config/blob/main/license.md)

A unified configuration manager for AI coding assistants that keeps Claude Code,
Codex, Gemini CLI, and OpenCode settings in sync.

Seamlessly deploy consistent instructions, commands, skills, and MCP
integrations across agents through a single installer, centralizing setup and
reducing maintenance.

## Why

AI tools all support configuration, but every agent uses a different format and
directory layout. Keeping them in sync by hand is slow and error-prone.

This project:

- Provides one installer for multiple agents
- Keeps installation paths and updates consistent
- Makes maintenance easier by centralizing the source of truth
- Ships curated best practices, agents, skills, and commands out of the box

## Quick Start

```sh
npx @azat-io/ai-config
```

The installer will:

- Ask which agents to install
- Ask for install scope (project or home)
- Ask which MCP servers to install
- Prompt for `GITHUB_PERSONAL_ACCESS_TOKEN` only if GitHub MCP is selected

<br>

<picture>
  <source
    srcset="https://raw.githubusercontent.com/azat-io/ai-config/main/assets/example-light.webp"
    media="(prefers-color-scheme: light)"
  />
  <source
    srcset="https://raw.githubusercontent.com/azat-io/ai-config/main/assets/example-dark.webp"
    media="(prefers-color-scheme: dark)"
  />
  <img
    src="https://raw.githubusercontent.com/azat-io/ai-config/main/assets/example-light.webp"
    alt="AI config interactive example"
    width="820"
  />
</picture>

## What Gets Installed

Sources live in this repo and are copied into each agent's config:

- `instructions/global.md`
- `commands/`
- `agents/`
- `skills/`
- `settings/mcp.ts` (GitHub, sequential-thinking, fetch)

## Install Scope

You choose one scope for the entire run.

### Project (local)

Creates dot-folders in the current project and places instructions in the
project root:

- Claude Code
  - `.claude/commands/`, `.claude/agents/`, `.claude/skills/`
  - `.claude/settings.json` (MCP)
  - `CLAUDE.md`
- Codex
  - `.codex/skills/`
  - `.codex/config.toml` (MCP)
  - `AGENTS.md`
- Gemini CLI
  - `.gemini/commands/`, `.gemini/agents/`, `.gemini/skills/`
  - `.gemini/settings.json` (MCP)
  - `GEMINI.md`
- OpenCode
  - `.opencode/commands/`, `.opencode/agents/`, `.opencode/skill/`
  - `opencode.json` (MCP)
  - `AGENTS.md`

### Home (global)

Uses the user config directories:

- Claude Code: `~/.claude/`
- Codex: `~/.codex/`
- Gemini CLI: `~/.gemini/`
- OpenCode: `~/.config/opencode/`

## Requirements

- Node.js v22+
- MCP dependencies (only if you plan to use MCP):
  - `github-mcp-server`
  - `uv` (for `uvx`)

## Supported Features

| Agent       | Instructions | Commands | Skills | Subagents | MCP |
| ----------- | ------------ | -------- | ------ | --------- | --- |
| Claude Code | Yes          | Yes      | Yes    | Yes       | Yes |
| Codex       | Yes          | No       | Yes    | No        | Yes |
| Gemini CLI  | Yes          | Yes      | Yes    | Yes       | Yes |
| OpenCode    | Yes          | Yes      | Yes    | Yes       | Yes |

## Built-in Features

### Commands

| Command                                                                                  | Description                                               |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`/blueprint`](https://github.com/azat-io/ai-config/blob/main/commands/blueprint.md)     | Create a detailed implementation blueprint before coding  |
| [`/code-review`](https://github.com/azat-io/ai-config/blob/main/commands/code-review.md) | Review code quality before merge                          |
| [`/commit`](https://github.com/azat-io/ai-config/blob/main/commands/commit.md)           | Generate Conventional Commits message from staged changes |
| [`/discovery`](https://github.com/azat-io/ai-config/blob/main/commands/discovery.md)     | Clarify vague ideas and align on scope                    |
| [`/docs`](https://github.com/azat-io/ai-config/blob/main/commands/docs.md)               | Write or update project documentation                     |
| [`/implement`](https://github.com/azat-io/ai-config/blob/main/commands/implement.md)     | Execute an approved implementation blueprint              |
| [`/refactor`](https://github.com/azat-io/ai-config/blob/main/commands/refactor.md)       | Refactor code while preserving behavior                   |
| [`/research`](https://github.com/azat-io/ai-config/blob/main/commands/research.md)       | Explore technical approaches when requirements are fuzzy  |
| [`/test`](https://github.com/azat-io/ai-config/blob/main/commands/test.md)               | Write tests for TDD or bug fixes                          |

### Skills

| Skill                                                                                                     | Description                                                     |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`blueprinting`](https://github.com/azat-io/ai-config/blob/main/skills/blueprinting/skill.md)             | Write detailed implementation blueprints before coding          |
| [`creating-skills`](https://github.com/azat-io/ai-config/blob/main/skills/creating-skills/skill.md)       | Create reusable techniques and patterns for AI agents           |
| [`creating-subagents`](https://github.com/azat-io/ai-config/blob/main/skills/creating-subagents/skill.md) | Create specialized subagents for recurring tasks                |
| [`discovering`](https://github.com/azat-io/ai-config/blob/main/skills/discovering/skill.md)               | Clarify goals and scope when the what/why is unclear            |
| [`implementing`](https://github.com/azat-io/ai-config/blob/main/skills/implementing/skill.md)             | Execute an approved implementation blueprint                    |
| [`refactoring`](https://github.com/azat-io/ai-config/blob/main/skills/refactoring/skill.md)               | Behavior-preserving restructuring for clarity and safer changes |
| [`researching`](https://github.com/azat-io/ai-config/blob/main/skills/researching/skill.md)               | Choose technical approaches when the how is unclear             |

### Agents

| Agent                                                                                                   | Description                                                |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`code-reviewer`](https://github.com/azat-io/ai-config/blob/main/agents/code-reviewer.md)               | Review code for correctness, security, and maintainability |
| [`documentation-writer`](https://github.com/azat-io/ai-config/blob/main/agents/documentation-writer.md) | Write README, API docs, JSDoc, and contributing guides     |
| [`implementer`](https://github.com/azat-io/ai-config/blob/main/agents/implementer.md)                   | Implement features following plans and specs               |
| [`test-writer`](https://github.com/azat-io/ai-config/blob/main/agents/test-writer.md)                   | Write focused tests with full code path coverage           |

### MCP Integrations

| Server                                                                                                  | Description                                 |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [Fetch](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch)                            | Fetch and process web pages                 |
| [GitHub](https://github.com/github/github-mcp-server)                                                   | Work with repos, issues, and pull requests  |
| [Sequential Thinking](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking) | Step-by-step reasoning for complex problems |

## See also

- [@azat-io/eslint-config](https://github.com/azat-io/eslint-config)
- [@azat-io/prettier-config](https://github.com/azat-io/prettier-config)
- [@azat-io/stylelint-config](https://github.com/azat-io/stylelint-config)
- [@azat-io/typescript-config](https://github.com/azat-io/typescript-config)

## License

MIT &copy; [Azat S.](https://azat.io)
