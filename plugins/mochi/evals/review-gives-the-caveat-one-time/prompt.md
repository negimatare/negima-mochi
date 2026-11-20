---
description: Reviewing a branch with two small areas in one run, with a report for each and no stop between them. The reply says one time that the Medium and Minor findings are not yet checked against the code, not in each report. It passes on 1.1.0 on Sonnet, which writes both reports in its final message, so it guards against a regression only.
tags: [review]
max_turns: 60
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:review this branch. Review api/ first, and give me its report before you start web/. Then review web/ and give me its report. Do not wait for me between the two areas.
