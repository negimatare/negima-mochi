---
description: Building an approved three-slice plan whose last slice can only ship after every client has upgraded says one pull request cannot keep that order, suggests /mochi:split, and waits instead of building it whole.
tags: [build, split]
plugins: ["../..", "../../eval-observer"]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build .plans/20261102-cart-currency.md
