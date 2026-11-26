---
description: A review for a build of part 2 of a stack finds a High bug in a line that part 1 added. It commits the fix on part 2's branch with the other fixes, leaves part 1's branch alone, and says that the bug came from part 1's code. It is a regression guard, since it passed on Sonnet before the owning-part rule.
tags: [review, build]
plugins: ["../..", "../../eval-observer"]
max_turns: 60
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:review feat/order-exports-2-customer-statement against feat/order-exports-1-monthly-csv, for a build of .plans/20261102-order-exports-2-customer-statement.md. Part 1's pull request is not merged yet. The tidy skill ran on every slice. Commit each area's fixes. It is one TypeScript area, so go straight ahead without asking me for an order. Fix only the 🟠 High and 🔴 Critical findings, without asking me to pick.
