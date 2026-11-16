---
description: Showing each order's customer name in OrderList does not import the customers slice, even though OrderSummary in the same slice already does.
tags: [architecture]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Each order row in OrderList should also show the customer's full name, formatted the way the customers feature formats names. You can add a getCustomer(id) call to the orders client for the data.
