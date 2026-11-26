---
description: Setting up a FastAPI project merges the stack plugin's Ruff preset into pyproject.toml, keeps the project's own select, and ignores the rule for the one file that breaks it today.
tags: [setup]
plugins: ["../..", "../../eval-stubs/ruff-stack"]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:setup-project Do it all without asking me: add the stack plugin's lint preset with every rule on, and an ignore for each file that breaks a rule today. Skip the dead-code tool, and write the CLAUDE.md. I have nothing to add.
