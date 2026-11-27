---
description: Building part 2 of a split plan while part 1's branch is unmerged stops and says so instead of building it. It is a regression guard, since Claude does this without the kit too.
tags: [build, split, core]
plugins: ["../..", "../../eval-observer"]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build .plans/20261102-order-exports-2-customer-csv.md
