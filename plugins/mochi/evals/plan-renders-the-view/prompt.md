---
description: Planning a frontend change that calls the API renders the plan view with the kit's script, with a data-flow diagram and the header before and after drawn from the product's own tokens, and stops for approval without writing code.
tags: [plan]
max_turns: 50
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build add a "Download CSV" button to the orders header that downloads GET /api/orders.csv through the existing orders client. To skip the questions: support staff need the orders in a spreadsheet; other formats are out of scope; it works when clicking the button saves orders.csv. Call the plan csv-download.
