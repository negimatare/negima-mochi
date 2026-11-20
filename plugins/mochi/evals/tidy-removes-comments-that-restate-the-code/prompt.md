---
description: Tidying an uncommitted loyalty module removes the comments that restate the next line or warn "do not change", keeps the one comment that gives a why (an upstream rounding bug), keeps the tests green, and commits nothing.
tags: [tidy]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Tidy my uncommitted change before I commit it.
