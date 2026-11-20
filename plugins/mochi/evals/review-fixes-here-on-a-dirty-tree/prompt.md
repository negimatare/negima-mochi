---
description: A review of part 2 of a stack, which the user starts, finds a High bug in a line that part 1 added, while part 2 has a change that is not committed. It fixes the bug on part 2's branch, leaves part 1's branch alone, and says why the fix is not on part 1. It is a regression guard, since the review did not switch branches for a fix before the owning-part rule.
tags: [review]
max_turns: 60
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:review feat/order-exports-2-customer-statement against feat/order-exports-1-monthly-csv. Part 1's pull request is not merged yet. It is one TypeScript area, so go straight ahead without asking me for an order. Fix only the 🟠 High and 🔴 Critical findings, without asking me to pick. You can switch branches for a fix without asking me.
