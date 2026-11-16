---
description: A new hold route gets a summary, a docstring, and a problem_response for each error it can raise, and the spec is regenerated or flagged, even though the dispatch route beside it has no metadata. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [openapi]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a hold_shipment use case: POST /api/v1/shipments/{shipment_id}/hold puts a pending shipment on hold so it can't be dispatched until it is released. No release endpoint yet.
