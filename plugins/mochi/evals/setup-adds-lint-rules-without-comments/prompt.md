---
description: Setting up a React + Fluent package adds the size rule its stack plugin sets to the ESLint config as the convention writes it, with no comments of its own.
tags: [setup]
plugins: ["../..", "./size-stack"]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:setup-project Do it all without asking me: add every lint rule the stack conventions set as `warn`, skip the dead-code tool, and write the CLAUDE.md. I have nothing to add.
