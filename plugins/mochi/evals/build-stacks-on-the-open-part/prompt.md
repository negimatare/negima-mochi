---
description: Building part 2 of a stacked split while part 1's branch is pushed but unmerged re-checks part 2, builds it on a branch cut from part 1's, reviews only part 2's commits, and hands over a pull request that targets part 1's branch. Without the kit, Claude also builds on part 1's branch when the plan says so; the kit adds the re-check and the review of only part 2's commits.
tags: [build, split]
max_turns: 70
timeout_seconds: 2100
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build .plans/20261102-order-exports-2-customer-csv.md Part 1's pull request is still open. I approve the re-checked plan in advance, and I fix none of the review findings, so go on to the hand-over without asking me.
