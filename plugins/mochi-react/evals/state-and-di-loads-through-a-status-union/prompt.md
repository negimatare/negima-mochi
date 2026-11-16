---
description: A new useOrder hook loads through the injected client and returns one status union, even though useCustomer nearby uses separate loading and error flags. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [state]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a useOrder(id) hook in src/features/orders/hooks/useOrder.ts that loads one order, and add the getOrder(id) call it needs to the orders client.
