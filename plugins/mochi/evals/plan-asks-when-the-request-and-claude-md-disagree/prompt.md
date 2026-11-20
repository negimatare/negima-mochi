---
description: Planning a converted checkout total, where the request says to load the exchange rate the same way the handler loads the tax rates and CLAUDE.md says handlers stay thin, names the disagreement and asks the user which to follow before deciding, and writes no code. Opus asks without the kit too; Sonnet, with or without the kit, picked a side in the plan until the plan skill's step 2 said to stop and ask.
tags: [plan, core]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build show the checkout total in the customer's currency. Load the exchange rate the same way the tax rates are loaded today. To skip the questions: customers outside the euro area see only euros and ask support for the converted price; no UI, the checkout response gains a `localTotal` next to `total`, rounded to 2 decimals; caching the rates is out of scope; it works when a customer paying in USD gets `localTotal` = `total` × the EUR→USD rate. Call the plan local-total.
