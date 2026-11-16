---
description: A new Refresh button gets its label through t() with a key in both locales, even though the Export button beside it is hard-coded. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [i18n]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a Refresh button to OrdersToolbar that calls a new onRefresh prop.
