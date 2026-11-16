---
description: Renaming the get_shipment use case keeps the published operation id get_shipment, or warns that the client's method would be renamed, as operation ids come from the function name. It is a regression guard, since Claude keeps the operation id without the kit too.
tags: [openapi]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Rename the get_shipment use case to show_shipment, the folder and the function. Nothing else changes.
