---
description: The refactor audit finds the discount rule repeated in three handlers, writes its audit file, and stops for the user to pick candidates without editing source.
tags: [refactor, tidy, correctness, tests, hygiene, core]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:refactor src/checkout — every change to the member discount breaks one of the handlers.
