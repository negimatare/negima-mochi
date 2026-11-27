---
description: The review of a branch that puts a search term from the request into SQL with an f-string runs the correctness reviewer and records the SQL injection as Critical or High in the findings file. The category query beside it passes a parameter, and gets no such finding. A security baseline case, with a planted hole at a trust boundary.
tags: [review, security]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review this branch. It is one Python area, so go straight ahead without asking me for an order.
