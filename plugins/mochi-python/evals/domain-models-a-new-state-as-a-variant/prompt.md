---
description: A returned-to-sender state becomes a new frozen dataclass in the ShipmentState union, carrying the reason, not a boolean flag on Shipment. It is a regression guard, since Claude models the state as a variant without the kit too.
tags: [domain]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

A dispatched shipment can now come back to us. Add a returned-to-sender state with the reason the carrier gave; a returned shipment can't be dispatched again. Only the domain for now, no endpoint.
