---
description: Marking a shipment delivered gets its own slice, registered in the module and its layers contract, even though the dispatch slice already serves a second route. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [architecture]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add POST /api/v1/shipments/{shipment_id}/deliver, which marks a dispatched shipment as delivered.
