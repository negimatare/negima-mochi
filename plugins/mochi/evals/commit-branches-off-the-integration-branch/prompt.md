---
description: In a project whose CLAUDE.md names develop as its integration branch while origin/HEAD is main, asked to commit and push on develop and draft the pull request, commit creates a feature branch, pushes it, leaves develop and main alone locally and on the remote, and the drafted pull request targets develop. The 1.4.0 text passed it 1 of 2 on Sonnet, as the model can read the line itself, and the no-plugin arm failed it on Opus; guard-git and review-target, which read the line too, have Node tests.
tags: [commit, pr, core]
plugins: ["../..", "../../eval-observer"]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Commit this and push it, then draft the pull request.
