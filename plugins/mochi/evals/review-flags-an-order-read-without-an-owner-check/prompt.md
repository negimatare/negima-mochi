---
description: The review of a branch that adds an order route with no check that the order belongs to the signed-in customer runs the correctness reviewer and records the hole as Critical or High in the findings file. The invoice route beside it checks the owner, and gets no such finding. A security baseline case, with a planted hole at a trust boundary.
tags: [review, security]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review this branch. It is one TypeScript area, so go straight ahead without asking me for an order.
