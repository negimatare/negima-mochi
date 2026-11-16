---
description: Tidying a change that adds a discount field named amt2 renames it in the schema and the code, and rebuilds the generated type with its generator instead of editing it. It is a regression guard, since Claude does this without the kit too.
tags: [tidy]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Tidy my uncommitted change before I commit it.
