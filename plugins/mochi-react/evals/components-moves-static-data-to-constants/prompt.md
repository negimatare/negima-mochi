---
description: A picker with five shipping options keeps the options in a constants file typed with as const, not inline in the component.
tags: [components]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a ShippingMethodPicker in src/features/orders/components that lets the user choose one of these: Standard (3-5 days, free), Express (1-2 days, $9), Overnight (next day, $19), Pickup (same day, free), and Freight (7-10 days, $49).
