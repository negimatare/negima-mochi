---
description: Tests for OrderList pass the shared fake client to the real provider, even though the useOrders test beside them mocks the contexts module. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [testing]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Write tests for OrderList in src/features/orders/components/OrderList/OrderList.test.tsx.
