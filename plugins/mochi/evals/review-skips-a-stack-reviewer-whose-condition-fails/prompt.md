---
description: The stub stack plugin has a conventions reviewer and a contract reviewer whose checks cover exported functions but that runs only when the area changes src/routes/. A review of a branch that changes only the pricing rule runs the conventions reviewer and leaves out the contract reviewer. The 1.0.0 review skill passes it too, since Claude already honours the condition in a description; it guards the condition against a regression.
tags: [review]
plugins: ["../..", "./route-stack"]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review this branch. It is one TypeScript area, so go straight ahead without asking me for an order.
