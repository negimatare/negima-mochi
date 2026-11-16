---
description: Calls the conventions reviewer directly in a package with React Hook Form and Zod. It reports an interface that repeats the schema, an input outside a Fluent Field with a hand-rolled error element, English hard-coded in the schema instead of i18n keys, and a separate saving flag instead of formState.isSubmitting.
tags: [conventions]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Bash]
---

Review src/features/profile/ against the stack conventions with the mochi-react conventions reviewer. Review the files as they stand, there is no diff; the project instructions are in ./CLAUDE.md. Show me its findings exactly as it reports them.
