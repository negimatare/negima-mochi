---
description: A full review of a small branch, asked for by name, runs the correctness, test, and hygiene reviewers instead of the quick reviewer, catches a percentage discount applied as an amount, grades it Critical or High, and records it in the findings file.
tags: [review, correctness, tests, hygiene]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review this branch. It is one TypeScript area, so go straight ahead without asking me for an order. Give it a full review.
