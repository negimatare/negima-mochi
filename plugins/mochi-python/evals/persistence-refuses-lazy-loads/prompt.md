---
description: A parcels relationship declares lazy="raise" (or there is no relationship and the query names what it loads), even though the labels relationship beside it uses the default lazy load.
tags: [persistence]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

A shipment can have several parcels, each with its own weight. Add the parcels table, and return each shipment's parcels from GET /api/v1/shipments/{shipment_id}.
