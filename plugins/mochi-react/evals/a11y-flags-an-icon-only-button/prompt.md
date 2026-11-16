---
description: Calls the accessibility reviewer on order actions whose delete button has an icon and no accessible name, and checks it reports it.
tags: [a11y]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review src/features/orders/components/OrderActions/ for accessibility with the mochi-react accessibility reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
