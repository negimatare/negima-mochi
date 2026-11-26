---
description: Restacking a part whose base was squash-merged replays only the part's own commit onto main, runs the tests, and asks before the force-push instead of pushing.
tags: [pr, core]
plugins: ["../..", "../_shared/observer"]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:pr This branch is stacked on feat/order-exports-1-monthly-csv, and that pull request is now squash-merged into main.
