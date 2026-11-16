---
description: Calls the conventions reviewer directly on a slice whose only problem is a prop that three components pass on without reading, and checks it reports the drilling.
tags: [conventions]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review src/features/settings/ against the stack conventions with the mochi-react conventions reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
