---
description: A bug report with no steps, expected, or actual behaviour gets one round of questions and no edits. It is a regression guard, since Claude does this without the kit too.
tags: [fix-bug]
plugins: ["../..", "../../eval-observer"]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:fix-bug the cart total is wrong sometimes
