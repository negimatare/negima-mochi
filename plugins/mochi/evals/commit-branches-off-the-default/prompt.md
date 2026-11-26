---
description: Asked to commit and push on main, commit creates a feature branch, pushes it, and leaves main alone locally and on the remote.
tags: [commit, core]
plugins: ["../..", "../_shared/observer"]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Commit this and push it.
