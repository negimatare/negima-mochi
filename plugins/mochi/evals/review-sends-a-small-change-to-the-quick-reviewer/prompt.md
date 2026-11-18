---
description: The review of a 12-line branch that reaches no trust boundary sends it to the quick reviewer alone, not the correctness, test, and hygiene reviewers, and still catches a percentage discount applied as an amount, graded Critical or High.
tags: [review, correctness, tests, hygiene]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review this branch. It is one TypeScript area, so go straight ahead without asking me for an order.
