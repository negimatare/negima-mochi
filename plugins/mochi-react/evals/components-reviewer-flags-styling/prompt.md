---
description: Calls the conventions reviewer on a component with two style maps, a deprecated Griffel shorthand, and a magic radius, and checks it reports each.
tags: [conventions]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review src/features/orders/components/PromoBanner/ against the stack conventions with the mochi-react conventions reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
