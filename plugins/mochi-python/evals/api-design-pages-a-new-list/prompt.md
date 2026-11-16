---
description: A new shipments list takes a capped limit and an opaque cursor and returns a named Page subclass, even though billing's rates list beside it returns a bare list with offset paging.
tags: [api-design]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add GET /api/v1/shipments as a list_shipments use case: shipments newest first, optionally filtered by status.
