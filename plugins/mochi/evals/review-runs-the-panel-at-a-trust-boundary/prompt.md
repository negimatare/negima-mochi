---
description: The review of a 10-line branch that changes who may share a document, a permission check, runs the correctness and test reviewers rather than the quick reviewer. The 1.0.0 review skill passes it too, since it always ran them; it guards the trust boundary against a regression.
tags: [review]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review this branch. It is one TypeScript area, so go straight ahead without asking me for an order.
