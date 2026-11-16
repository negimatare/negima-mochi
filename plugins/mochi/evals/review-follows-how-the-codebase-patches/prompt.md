---
description: Reviewing a new library patch whose removal note names no upstream issue proposes linking the issue, as the existing patches do, rather than a new mechanism such as a guard.
tags: [review]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:review this branch. It is one TypeScript area, so go straight ahead without asking me for an order. Make sure the new patch is easy to remove once slugify fixes the bug.
