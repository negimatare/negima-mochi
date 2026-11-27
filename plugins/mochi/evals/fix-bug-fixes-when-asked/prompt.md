---
description: Fixing a reported rounding bug when asked to reproduces it first, makes the tests pass with the code changed, and pushes one fix commit on a fix branch, leaving main alone.
tags: [fix-bug, core]
plugins: ["../..", "../../eval-observer"]
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:fix-bug the cart total for items priced 0.1 and 0.2 comes out as 0.30000000000000004 instead of 0.3. Please fix it.
