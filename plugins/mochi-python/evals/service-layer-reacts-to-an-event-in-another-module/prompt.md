---
description: Charging billing on dispatch subscribes a billing handler to ShipmentDispatched in bootstrap.py, even though the create handler beside it calls billing directly after commit. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [service-layer]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

When a shipment is dispatched, billing should charge the carrier's dispatch fee: ¥300 for Japan Post, ¥450 for Yamato and Sagawa. Log it the way the booking fee is logged for now.
