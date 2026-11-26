---
description: Splitting a plan the user already agreed to writes one plan per part, marks every later part to wait for the one before, turns the original into an index, and challenges and renders part 1.
tags: [split, core]
plugins: ["../..", "../_shared/observer"]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:split .plans/20261102-order-exports.md I accept the split you recommend, so write the parts without asking me first.
