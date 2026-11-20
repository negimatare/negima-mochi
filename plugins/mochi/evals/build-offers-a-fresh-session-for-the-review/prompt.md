---
description: After building a two-slice plan, build hands over what was built and asks whether to review in this session or after /clear, gives the /mochi:review command in full with the branch, the build phrase with the plan path and the tidy note and the /mochi:pr step after it, and does not start the review before the user answers.
tags: [build]
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build .plans/20261102-member-discount.md
