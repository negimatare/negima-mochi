---
description: Japan Post's weight limit becomes a rule on the Shipment aggregate with its own Conflict exception, even though the dispatch handler already holds a carrier rule of its own.
tags: [domain]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Japan Post doesn't take parcels over 20 kg. Dispatching a heavier shipment with Japan Post should fail with a 409.
