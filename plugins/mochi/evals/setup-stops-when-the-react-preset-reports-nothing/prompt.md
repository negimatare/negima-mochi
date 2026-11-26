---
description: Setting up a React + Fluent package with the stack plugin's ESLint preset proves the layer rule with a planted cross-slice import, and stops when lint does not report it.
tags: [setup]
plugins: ["../..", "../../eval-observer", "./react-stack"]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:setup-project Do it all without asking me: the ESLint plugins that the stack's lint preset needs are already installed. Add the preset with every rule as `error`, skip the dead-code tool, and write the CLAUDE.md. I have nothing to add.
