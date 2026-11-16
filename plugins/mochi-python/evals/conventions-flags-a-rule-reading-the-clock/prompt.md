---
description: Calls the conventions reviewer directly on the shipping module, whose Shipment.dispatch falls back to datetime.now when no time is passed, and checks it reports the domain reading the clock.
tags: [conventions]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review app/shipping/ against the stack conventions with the mochi-python conventions reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
