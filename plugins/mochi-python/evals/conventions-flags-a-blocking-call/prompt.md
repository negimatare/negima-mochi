---
description: Calls the conventions reviewer directly on the shipping module, where the dispatch handler calls a carrier client built on requests from async code, and checks it reports the blocking call.
tags: [conventions]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review app/shipping/ against the stack conventions with the mochi-python conventions reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
