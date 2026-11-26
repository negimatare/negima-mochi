---
description: Opening the pull request of part 2, after a review fix was committed on part 1 and part 2 was rebased locally, restacks it. Part 1 is ahead of its remote, and part 2 has diverged from its upstream. It pushes part 1 as a fast-forward and part 2 with --force-with-lease, never with a plain force. It is a regression guard, since it passed on Sonnet before the restack triggers for a local base.
tags: [pr, core]
plugins: ["../..", "../../eval-observer"]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:pr feat/order-exports-1-monthly-csv Part 1's pull request is not merged. You can push without asking me.
