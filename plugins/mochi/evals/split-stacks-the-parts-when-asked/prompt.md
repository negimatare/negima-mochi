---
description: Splitting a plan into stacked parts, as the user asks, marks every later part as stacked on the one before instead of waiting for its merge, and says so in the index.
tags: [split]
plugins: ["../..", "../../eval-observer"]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:split .plans/20261102-order-exports.md stacked. I accept the split you recommend, so write the parts without asking me first.
