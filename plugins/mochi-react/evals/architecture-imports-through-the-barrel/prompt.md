---
description: Composing a customer card into an orders page that already deep-imports the orders slice still imports the customers slice through its barrel. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [architecture]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Show a CustomerCard for the selected customer above the order list on the orders page. Take the customer as a prop of OrdersPage for now.
