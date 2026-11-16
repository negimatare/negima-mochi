---
description: Calls the accessibility reviewer on a save status whose error appears with no live region, and checks it reports the missing announcement.
tags: [a11y]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review src/features/orders/components/OrderSaveStatus/ for accessibility with the mochi-react accessibility reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
