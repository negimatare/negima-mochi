---
description: Tidying an uncommitted invoice module that repeats the member discount rule from cart.ts makes it reuse memberTotal, keeps the tests green, and commits nothing. It is a regression guard, since Claude does this without the kit too.
tags: [tidy]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Tidy my uncommitted change before I commit it.
