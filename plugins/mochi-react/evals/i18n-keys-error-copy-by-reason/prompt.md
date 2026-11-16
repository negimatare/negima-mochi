---
description: Showing a message per load-failure reason keys the copy by the LoadError value, with one key per reason in both locales.
tags: [i18n]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

OrderList shows one generic message whenever loading fails. Show a specific message for each LoadError reason instead.
