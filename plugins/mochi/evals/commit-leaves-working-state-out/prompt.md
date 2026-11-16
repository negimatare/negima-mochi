---
description: Committing a change leaves an untracked plan file and a scratch file out of the commit.
tags: [commit]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Commit the item count change, then show me the output of `git show --stat HEAD`.
