---
description: Adding a money helper only the orders feature uses keeps it in that feature, even though a one-consumer date helper already sits in src/utils. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [architecture]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a formatOrderTotal helper that shows an order total such as 12.5 as "$12.50", and use it for the total in OrderList.
