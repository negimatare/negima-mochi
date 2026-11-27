---
description: Calls the correctness reviewer on a branch that copies an export's row builder, which takes the status from the published text while exporting the draft, and promises the dashboard format.
tags: [correctness]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review this branch with the mochi correctness reviewer. Write `git diff main...HEAD` to a file and give it that file and ./CLAUDE.md. Show me its findings exactly as it reports them.
