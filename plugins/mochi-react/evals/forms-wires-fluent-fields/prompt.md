---
description: A form with a textarea and a dropdown registers the native-backed textarea, puts the dropdown under a Controller, and shows errors through Field.
tags: [forms]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add an OrderNoteForm in src/features/orders/components with a note of at most 500 characters and a priority dropdown (low, normal, high), and an onSubmit prop.
