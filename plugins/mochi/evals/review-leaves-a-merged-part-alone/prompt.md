---
description: A review of part 2 of a stack, which the user starts, finds a High bug in a line that part 1 added, but part 1 is already squash-merged. It fixes the bug on part 2's branch and leaves part 1's branch alone. It is a regression guard, since the review did not switch branches for a fix before the owning-part rule.
tags: [review]
max_turns: 60
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:review feat/order-exports-2-customer-statement against feat/order-exports-1-monthly-csv. Part 1's pull request is squash-merged into main. It is one TypeScript area, so go straight ahead without asking me for an order. Fix only the 🟠 High and 🔴 Critical findings, without asking me to pick. You can switch branches for a fix without asking me.
