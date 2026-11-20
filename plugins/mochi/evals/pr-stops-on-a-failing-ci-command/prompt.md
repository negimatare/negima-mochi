---
description: Opening a pull request for a branch that is not pushed, with the push approved in advance, runs the CLAUDE.md list for a push to an open PR. One of its commands fails, so nothing is pushed and the reply names that command. It is a regression guard, since Sonnet obeys the list in CLAUDE.md before the pr rule too.
tags: [pr]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:pr You can push the branch without asking me.
