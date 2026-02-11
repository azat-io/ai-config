---
name: creating-skills
description:
  Use when need to create reusable technique, pattern, or reference guide for AI
  agents
---

# Creating Skills

Skills are reference guides for proven techniques, patterns, or tools. They help
AI agents find and apply effective approaches.

## When to Create

- Technique wasn't intuitively obvious
- Pattern applies broadly (not project-specific)
- Would reference this again across projects

Skip if: one-off solution, project-specific convention (→ put in CLAUDE.md), or
well-documented elsewhere.

## Skill Types

| Type      | Purpose                        | Example                  |
| --------- | ------------------------------ | ------------------------ |
| Technique | Concrete method with steps     | discovering, researching |
| Pattern   | Way of thinking about problems | creating-subagents       |
| Reference | API docs, syntax guides        | tool documentation       |

## File Structure

```
skills/
  skill-name/
    skill.md    # Main reference (required)
    *.md        # Supporting files if needed
```

## skill.md Structure

```markdown
---
name: skill-name
description: Use when [specific triggering conditions].
---

# Skill Name

## Overview

What is this? Core principle in 1-2 sentences.

## When to Use

- Symptoms, situations, triggers
- When NOT to use

## Quick Reference

Table or bullets for scanning.

## Core Pattern

Main technique or approach.

## Delegate (if applicable)

Which agents/subagents to use and when.

## Common Mistakes

What goes wrong + fixes.
```

## Description Rules

**Description = When to Use, NOT What It Does**

```yaml
# ❌ BAD: Describes process
description: Evaluates options with evidence to choose approach.

# ❌ BAD: Too vague
description: For research tasks.

# ✅ GOOD: Triggering conditions only
description: Use when requirements are fuzzy or multiple approaches exist.
```

Why: If description summarizes workflow, AI may follow description instead of
reading the full skill content.

## Naming

- Lowercase with hyphens: `creating-skills`
- Gerunds for processes: `discovering`, `researching`, `creating-subagents`
- Verb-first, active voice

## Design Process

### 1. Define the Problem

Before writing:

- What technique/pattern does this teach?
- When should AI use this skill?
- What are the triggering symptoms?

### 2. Write Description First

Description determines when skill is loaded. Write it before content.

### 3. Minimal Content

- Start with the smallest skill that works
- Add sections only when needed
- Tables > prose for reference material

### 4. Test Before Deploy

Run scenarios where skill should activate:

- Does AI find the skill?
- Does AI follow the technique correctly?
- Are there gaps or ambiguities?

### 5. Iterate

When skill fails, identify the gap and fix.

## Common Mistakes

| Mistake                       | Fix                                         |
| ----------------------------- | ------------------------------------------- |
| Description describes process | Only triggering conditions                  |
| Too much content              | Minimal, scannable, tables                  |
| Narrative storytelling        | Structured reference format                 |
| Project-specific rules        | Put in CLAUDE.md instead                    |
| No "When to Use" section      | Always include triggers and skip conditions |
| Generic labels in examples    | Semantic, meaningful names                  |

## Cross-References

Reference other skills by name:

```markdown
# ✅ Good

**Prerequisites:** Use **discovering** skill first.

# ❌ Bad: force-loads file

@skills/discovering/skill.md
```

## Creation Checklist

- [ ] Problem clearly defined
- [ ] Description starts with "Use when..."
- [ ] Description has triggering conditions only (no workflow)
- [ ] Name uses gerund for processes
- [ ] When to Use section with triggers and skip conditions
- [ ] Quick Reference for scanning
- [ ] Common Mistakes section
- [ ] Delegate section if skill uses agents or subagents
- [ ] Pipeline navigation (what comes before/after)
- [ ] Tested on real scenario
