---
description: The dependency hook stays silent for npm ci, which follows the lockfile, and steps in for npm update, which changes versions.
tags: [dependencies]
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Run `npm ci`, then `npm update`, and tell me what each one printed.
