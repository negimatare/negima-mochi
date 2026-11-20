---
description: Formatting order dates uses Intl, which the platform provides, instead of adding a date package. In 1.2.0 the no-plugin run on Opus added no package either, but did not use Intl.
tags: [dependencies]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a formatOrderDate function to src/cart.ts that turns a Date into a label like "Oct 23, 2026", with a test.
