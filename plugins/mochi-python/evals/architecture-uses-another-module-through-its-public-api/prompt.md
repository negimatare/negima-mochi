---
description: Showing the price on GET /shipments/{id} imports billing through app.billing, even though the list slice beside it reaches into billing's domain. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [architecture]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

GET /api/v1/shipments/{shipment_id} should also return the shipment's price, the way billing prices it.
