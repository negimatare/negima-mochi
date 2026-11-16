---
description: Building a plan that rests on a function that does not exist stops and reports the false fact instead of committing or inventing the function. It is a regression guard, since Claude does this without the kit too.
tags: [build]
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build .plans/20261102-member-discount.md
