---
description: Refusing a suspended carrier raises a named domain exception that the app maps to a documented problem, even though get_shipment beside it raises HTTPException itself. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [api-design]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Carriers can be suspended: add a setting SHIPPING_SUSPENDED_CARRIERS, a list of carriers. Dispatching with a suspended carrier must fail and tell the client which carrier is suspended.
