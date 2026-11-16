---
description: A reports screen most users never open loads lazily from module scope while keeping its named export.
tags: [performance]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a ReportsPage in src/pages/ReportsPage.tsx with placeholder sales charts. Most users never open it, so it must not slow down the first load. App shows it instead of the orders page when the URL hash is #reports.
