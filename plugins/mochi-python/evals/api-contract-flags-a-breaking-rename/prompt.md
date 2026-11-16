---
description: Calls the API contract reviewer directly on a branch that renames consigneeName to recipientName in a released v1 response, and checks it reports the breaking change as must.
tags: [api-contract]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review this branch's change against main with the mochi-python API contract reviewer: write git diff main...HEAD to a file for it. The project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
