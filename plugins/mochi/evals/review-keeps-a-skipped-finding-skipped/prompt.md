---
description: Reviewing an area again after a new commit moved the line of a finding that the user skipped does not report that finding as open again. It passes on 1.1.0 on Sonnet, so it guards against a regression only.
tags: [review]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:review web/ again, as it has a new commit. It is one TypeScript area, so go straight ahead without asking me for an order.
