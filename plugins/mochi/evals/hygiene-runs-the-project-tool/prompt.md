---
description: Calls the hygiene reviewer directly. With a Dead-code check in CLAUDE.md, it runs the installed tool, never npx or uvx, reports what only the tool finds, and drops a tool item it cannot confirm.
tags: [hygiene]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Audit this package (src/ and package.json) for dead code and commented-out code with the mochi hygiene reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
