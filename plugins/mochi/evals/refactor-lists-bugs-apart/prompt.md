---
description: An area audit that finds refunds rounding against the customer lists it under bugs for fix-bug, graded Critical or High, not as a refactor candidate.
tags: [refactor]
plugins: ["../..", "../../eval-observer"]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write]
---

/mochi:refactor src/checkout — every change to the member discount breaks one of the handlers.
