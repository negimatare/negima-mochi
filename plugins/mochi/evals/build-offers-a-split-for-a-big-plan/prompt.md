---
description: Building an approved plan with seven slices says it is too big for one pull request, suggests /mochi:split, and waits instead of building it whole.
tags: [build, split]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build .plans/20261102-order-exports.md
