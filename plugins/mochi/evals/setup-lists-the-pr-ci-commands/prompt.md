---
description: Setting up a project whose pull_request workflow runs a link check writes that check into a "Before a push to an open PR" list, and runs it. The list leaves out the tests, which Verification runs, and the preview deploy, which needs a secret: it does not run the deploy and does not list it.
tags: [setup]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:setup-project You can write the CLAUDE.md straight away: I approve what the code shows, and I have nothing to add.
