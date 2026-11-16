---
description: A language switcher names each language in its own script, even though the locale files already hold translated language names it could use. It is a regression guard, since Claude resists the neighbour without the kit too.
tags: [i18n]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add a LanguageSwitcher in src/features/settings/components/LanguageSwitcher/ that lets the user switch between English and Japanese.
