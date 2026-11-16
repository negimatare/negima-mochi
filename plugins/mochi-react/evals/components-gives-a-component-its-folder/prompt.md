---
description: A new StatusBadge gets its own folder with a barrel and a Griffel style hook file, even though PriorityTag beside it is a flat file with inline styles. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [components]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a StatusBadge component in src/features/orders/components that shows an order's status as a small pill with a coloured dot before the label, a different colour per status, and use it in OrderList.
