---
description: Setting up a project asks at most four questions, none about what the code already shows, and writes nothing before the user answers. It is a regression guard, since Claude does this without the kit too.
tags: [setup]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:setup-project
