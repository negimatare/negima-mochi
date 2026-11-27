---
description: Drafting a pull request for a branch that changes the markup of a component, in a project whose CLAUDE.md has a Runtime check, when asked for the screenshots. The run makes them with the check, on the branch and on a copy of the base from git archive, not by switching the checkout (the 1.4.0 pr skill switched it to the local main), and the body's Before and After table shows the two images. The no-plugin baseline fails it on Opus.
tags: [pr, core]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:pr — make the before and after screenshots with the runtime check.
