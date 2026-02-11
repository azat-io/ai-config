---
name: refactoring
description:
  Use when code needs behavior-preserving restructuring to improve clarity,
  reduce duplication, or enable safer changes without altering outputs
---

# Refactoring

Use when behavior must remain the same while improving structure, readability,
or testability.

**Prerequisites:** Tests exist or you can add characterization tests to lock
behavior.

## When to Use

- Behavior must remain the same
- Code is hard to read, too long, deeply nested, or duplicated
- Small changes are risky because logic is entangled
- You want to enable safer changes later

Skip if: you are changing behavior or adding features, there is no safety net
and you cannot add characterization tests, or the issue is purely formatting or
linting.

## Quick Reference

- Define invariants for inputs, outputs, and side effects
- Ensure a safety net with tests or characterization checks
- Apply the smallest possible refactor step
- Verify after each step
- Stop once the code is clear enough

## Smell to Refactor

| Smell         | Refactor                      |
| ------------- | ----------------------------- |
| Long function | Extract function              |
| Magic value   | Extract constant              |
| Unclear name  | Rename for intent             |
| Deep nesting  | Guard clauses or early return |
| God class     | Split responsibilities        |
| Duplication   | Extract shared function       |

## Delegate

- Use **test-writer** agent to add characterization tests when no safety net
  exists
- Use **planning** skill for multi-step refactors that need sequencing
- Use **researching** skill when the right approach is unclear
- Use **code-reviewer** agent to verify after refactoring

Pipeline: refactoring → code-review

## Core Pattern

- **Scope**: pick the smallest slice that matters
- **Lock behavior**: tests, snapshots, or golden outputs
- **Micro refactors**: extract function or variable, rename for intent, split
  responsibilities, replace nested conditionals with guard clauses
- **Verify**: run checks after each step
- **Stop**: avoid polishing beyond the goal

## Output

Before refactoring:

- Target files
- Invariants
- Safety net

After refactoring:

- What changed structurally
- What stayed the same
- Remaining risks or TODOs

## Common Mistakes

- Mixing refactors with feature changes
- Large diffs without checkpoints
- Skipping the safety net and guessing behavior
- Renaming without improving structure
