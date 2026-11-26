---
description: Building an approved two-slice plan from main commits each slice on a feature branch, pushes it, leaves main alone, and stops for the user to pick review findings.
tags: [build, core]
plugins: ["../..", "../_shared/observer"]
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build .plans/20261102-member-discount.md Review it in this session.
