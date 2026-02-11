---
name: blueprinting
description:
  Use when approach is chosen and need a detailed implementation plan before
  coding. After researching, before implementer
---

# Blueprinting

Write detailed implementation blueprints with bite-sized tasks. Assume the
implementer has zero context — document everything needed. Output is a
blueprint, not code.

## When to Use

- Approach chosen (from researching)
- Multi-step task requiring coordination
- Need to break down complex feature

Skip if: trivial change, single-file fix, or approach not yet chosen (→ use
researching first).

## Principles

- **Bite-sized tasks** — each step is one action (2-5 minutes)
- **Exact paths** — no ambiguity about which files
- **Description + key snippets** — full code only for non-trivial logic
- **Exact commands** — with expected output where relevant
- **DRY, YAGNI** — minimal scope, no future-proofing
- **Assumptions** — call out unknowns with confidence (H/M/L)

## Quick Reference

1. Frame: goal, non-goals, constraints
2. Inventory: files and entry points to touch
3. Tasks: small steps with exact paths
4. Verification: checks for each task
5. Risks: assumptions and unknowns

## Blueprint Structure

```markdown
# [Feature Name] Implementation Blueprint

**Goal:** One sentence describing what this builds.

**Approach:** 2-3 sentences about technical approach.

---

## Task 1: [Component Name]

**Files:**

- Create: `exact/path/to/file.ext`
- Modify: `exact/path/to/existing.ext`
- Test: `tests/exact/path/to/test.ext` (if TDD)

**Steps:**

1. [Description of what to do]
2. [Next step]
3. ...

**Verify:**

- [Command or check]

**Notes:** [Key snippets, edge cases, or non-obvious details]

---

## Task 2: ...
```

## TDD

Use TDD flow (test first) for:

- Functional changes with clear inputs/outputs
- Bug fixes (write failing test that reproduces bug)

Skip TDD for:

- Configs, docs, infra
- Trivial changes
- Exploratory work

## Task Granularity

Each step is one atomic action:

| ✅ Good (atomic)                | ❌ Bad (too big)          |
| ------------------------------- | ------------------------- |
| Add validation for null input   | Add validation            |
| Create User model with fields   | Implement user management |
| Update config to enable feature | Set up the feature        |

## What to Include

**Always:**

- Exact file paths (create/modify/test)
- Clear step descriptions
- Key snippets for non-obvious logic
- Assumptions with confidence (H/M/L)

**If relevant:**

- Test commands with expected output
- Dependencies to install
- Environment variables
- Migration steps

## Common Mistakes

| Mistake              | Fix                             |
| -------------------- | ------------------------------- |
| Full code everywhere | Description + key snippets      |
| Missing file paths   | Exact paths for every file      |
| Big tasks (>5 min)   | Break into atomic steps         |
| TDD for everything   | TDD for functional changes only |
| Scope creep          | Stick to goal, YAGNI            |

## Delegate

- Use **Explore** subagent to inventory files and entry points
- Use **test-writer** agent for TDD tasks in blueprint

## After Blueprinting

Hand off to **implementer** agent (or use **implementing** skill for
step-by-step execution with checkpoints).

Pipeline: discovering → researching → **blueprinting** → implementing →
code-review
