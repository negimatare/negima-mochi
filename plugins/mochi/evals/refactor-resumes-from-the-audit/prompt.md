---
description: Refactoring an area that already has an audit file continues from its open candidates instead of auditing again.
tags: [refactor]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write]
---

/mochi:refactor src/checkout — every change to the member discount breaks one of the handlers.
