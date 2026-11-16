---
description: Adding a tracking number writes a migration with op.add_column, a nullable column, and no app imports, even though the first migration builds its table from the ORM model. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [persistence]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Shipments get a tracking number from the carrier when they are dispatched. Store it, with the migration in migrations/versions/0002_add_tracking_number.py.
