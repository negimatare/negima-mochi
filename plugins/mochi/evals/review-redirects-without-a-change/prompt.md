---
description: A request to review code with no change to diff is an audit, so review points to /mochi:refactor instead of reviewing.
tags: [review, smoke]
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

/mochi:review the whole repository as it stands. There is no pull request or branch, I just want a general health check of src/.
