---
description: Opening the pull request of part 2, after a local restack onto a review fix on part 1, finds a commit that another person pushed to part 2's branch. It stops before the restack, shows that commit, and pushes nothing, so the lease push does not delete it. It is a regression guard, since it passed on Sonnet before the rule.
tags: [pr, core]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:pr feat/order-exports-1-monthly-csv Part 1's pull request is not merged. You can push without asking me.
