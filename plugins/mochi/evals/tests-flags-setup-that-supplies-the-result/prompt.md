---
description: Calls the test reviewer directly on a branch whose test builds an order that is already shipped, so it passes although markShipped never sets the status.
tags: [tests]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review the tests on this branch with the mochi test reviewer. Write `git diff main...HEAD` to a file and give it that file and ./CLAUDE.md. Show me its findings exactly as it reports them.
