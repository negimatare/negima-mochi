---
description: An autonomous review of a small branch with a High bug (a percentage discount applied as an amount) fixes the bug without stopping for the findings pick, marks it fixed in the findings file, leaves the Medium and Minor findings open, and pushes nothing. The 1.4.0 text stops for the pick.
tags: [review, core]
max_turns: 60
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:review this branch, autonomous. It is one TypeScript area.
