---
description: A 24-hour cancellation window puts the rule in the domain and takes now from the injected clock, even though the create handler beside it reads datetime.now. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [service-layer]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a cancel_shipment use case: POST /api/v1/shipments/{shipment_id}/cancel. A pending shipment can be cancelled within 24 hours of booking; after that, or once it is dispatched, cancelling fails with a 409.
