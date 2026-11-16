---
description: Calls the hygiene reviewer directly. Without a dead-code tool, it sweeps every export, catches code only commented-out code or tests use, and keeps code wired through a second HTML entry.
tags: [hygiene]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Audit src/ for dead code and commented-out code with the mochi hygiene reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
