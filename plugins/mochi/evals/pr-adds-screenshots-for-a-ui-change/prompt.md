---
description: Drafting a pull request for a branch that changes the markup of a component, with a before and an after screenshot given. The body has a Before and After table with the two images. The printed gh command attaches both images by their absolute paths. The reply tells the user to check that the images show no customer data.
tags: [pr]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:pr screenshots: before is shots/before.png, after is shots/after.png
