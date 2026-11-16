---
description: A test for an auto refresh advances fake timers, even though the interval is a prop that could be shortened and a neighbouring test waits in real time. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [testing]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Write tests for AutoRefresh in src/features/orders/components/AutoRefresh/AutoRefresh.test.tsx.
