---
description: Tests for OrdersToolbar query by role and use userEvent, even though the CustomerCard test nearby uses a snapshot and a test id. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [testing]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Write tests for OrdersToolbar in src/features/orders/components/OrdersToolbar/OrdersToolbar.test.tsx.
