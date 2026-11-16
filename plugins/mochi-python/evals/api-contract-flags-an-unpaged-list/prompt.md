---
description: Calls the API contract reviewer directly on the shipping module, whose list endpoint returns every shipment as a bare list, and checks it reports the missing pagination.
tags: [api-contract, smoke]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review app/shipping/ with the mochi-python API contract reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
