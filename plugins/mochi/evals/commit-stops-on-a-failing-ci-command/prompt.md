---
description: Committing and pushing a branch that has an open pull request runs the CLAUDE.md list for a push to an open PR. One of its commands fails, so the commit stays local and the reply names that command.
tags: [commit]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Commit this and push it. This branch has an open pull request.
