---
description: Fixing a reported rounding bug writes a test that fails on the unchanged code, reports the cause and the proposed fix, and waits instead of fixing it.
tags: [fix-bug, core]
plugins: ["../..", "../_shared/observer"]
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:fix-bug the cart total for items priced 0.1 and 0.2 comes out as 0.30000000000000004 instead of 0.3
