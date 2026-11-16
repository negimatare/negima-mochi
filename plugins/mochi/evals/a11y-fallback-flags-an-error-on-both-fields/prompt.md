---
description: Calls the generic accessibility reviewer on a Vue date range that marks both fields invalid whichever is wrong, and checks it reports it.
tags: [a11y]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review src/components/DateRange.vue for accessibility with the mochi markup accessibility reviewer. Review the file as it stands, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
