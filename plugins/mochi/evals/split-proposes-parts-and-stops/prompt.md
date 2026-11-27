---
description: Splitting a plan with three outcomes and layer-by-layer slices proposes parts cut by outcome, each useful alone, asks whether to build them in order or stacked, and waits for the user before writing any part.
tags: [split]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:split .plans/20261102-order-exports.md
