---
description: Calls the hygiene reviewer on a branch whose doc says the export's end date is included while the code excludes it, and does not report the US spelling of the doc.
tags: [hygiene]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review this branch with the mochi hygiene reviewer. Write `git diff main...HEAD` to a file and give it that file and ./CLAUDE.md. Show me its findings exactly as it reports them.
