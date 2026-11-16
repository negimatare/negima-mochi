---
description: Calls the conventions reviewer directly. It reports inlined static data, an effect that mirrors props into state, a reset a key would do, a parent notified from an effect, and the state left in a .tsx component that belongs in a useX hook, and leaves alone a hook whose effect subscribes to the window.
tags: [conventions]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review src/features/settings/ against the stack conventions with the mochi-react conventions reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
