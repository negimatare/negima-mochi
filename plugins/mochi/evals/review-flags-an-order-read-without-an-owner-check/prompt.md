---
description: The review of a branch that adds an order route with no check that the order belongs to the signed-in customer runs the correctness reviewer and records the hole as Critical or High in the findings file. The invoice route beside it checks the owner, and gets no such finding. The no-plugin baseline finds the hole too, on Opus and Sonnet, so the case does not show what the kit adds. It guards the kit's part, the hole recorded as blocking at its line and the change sent to a reviewer, against a regression.
tags: [review, security]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review this branch. It is one TypeScript area, so go straight ahead without asking me for an order.
