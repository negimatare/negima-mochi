---
description: Building an approved one-slice plan runs the slice's test and sees it fail on the old code before it edits src/cart.ts, then ends with the tests green and, with only one slice, goes straight on to the review.
tags: [build]
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build .plans/20261102-member-discount.md
