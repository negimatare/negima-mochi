---
description: The stub stack plugin has a contract reviewer that runs only when the area changes src/routes/. A review of a branch that changes the pricing rule and the quote route launches it, next to the stub's conventions reviewer.
tags: [review]
plugins: ["../..", "./route-stack"]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review this branch. It is one TypeScript area, so go straight ahead without asking me for an order.
