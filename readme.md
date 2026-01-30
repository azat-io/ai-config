# AI Config

<img
  src="https://raw.githubusercontent.com/azat-io/ai-config/main/assets/logo.svg"
  alt="AI Config Logo"
  align="right"
  height="160"
  width="160"
/>

[![Version](https://img.shields.io/npm/v/@azat-io/ai-config.svg?color=fff&labelColor=f580b1)](https://npmjs.com/package/@azat-io/ai-config)
[![GitHub License](https://img.shields.io/badge/license-MIT-232428.svg?color=fff&labelColor=f580b1)](https://github.com/azat-io/ai-config/blob/main/license.md)

A unified configuration manager for AI coding assistants that keeps Claude Code,
Codex, Gemini CLI, and OpenCode settings in sync.

Seamlessly deploy consistent instructions, commands, skills, and MCP
integrations across multiple agents through a single installer.

This config centralizes AI tool setup in one place, ensuring consistent coding
standards and reducing manual maintenance across different agent formats.

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

| Command        | Description                                               |
| -------------- | --------------------------------------------------------- |
| `/commit`      | Generate Conventional Commits message from staged changes |
| `/code-review` | Review code quality before merge                          |
| `/discovery`   | Clarify vague ideas and align on scope                    |
| `/implement`   | Execute an approved implementation plan                   |
| `/research`    | Explore technical approaches when requirements are fuzzy  |

### Skills

| Skill                | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `creating-skills`    | Create reusable techniques and patterns for AI agents |
| `creating-subagents` | Create specialized subagents for recurring tasks      |
| `discovering`        | Clarify goals and scope when the what/why is unclear  |
| `implementing`       | Execute an approved implementation plan               |
| `planning`           | Write detailed implementation plans before coding     |
| `researching`        | Choose technical approaches when the how is unclear   |

### Agents

| Agent                  | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `code-reviewer`        | Review code for correctness, security, and maintainability |
| `documentation-writer` | Write README, API docs, JSDoc, and contributing guides     |
| `implementer`          | Implement features following plans and specs               |
| `test-writer`          | Write focused tests with full code path coverage           |

### MCP Integrations

| Server              | Description                                 |
| ------------------- | ------------------------------------------- |
| GitHub              | Work with repos, issues, and pull requests  |
| Sequential Thinking | Step-by-step reasoning for complex problems |
| Fetch               | Fetch and process web pages                 |

## See also

- [@azat-io/eslint-config](https://github.com/azat-io/eslint-config)
- [@azat-io/prettier-config](https://github.com/azat-io/prettier-config)
- [@azat-io/stylelint-config](https://github.com/azat-io/stylelint-config)
- [@azat-io/typescript-config](https://github.com/azat-io/typescript-config)

## License

MIT &copy; [Azat S.](https://azat.io)
