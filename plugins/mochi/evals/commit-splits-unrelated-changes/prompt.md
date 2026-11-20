---
description: Committing two unrelated changes makes two commits, one per concern, staged by explicit path.
tags: [commit, core]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Commit my changes. Split them however you think is right, then show me the output of `git log --stat -3`.
