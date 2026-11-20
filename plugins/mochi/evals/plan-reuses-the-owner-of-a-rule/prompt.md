---
description: Planning a month's CSV export finds that billableOrders in the statement module already owns which orders count for a month, records it as the existing solution instead of ordersInMonth beside the export it was pointed at, and stops for approval without writing code.
tags: [plan, core]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build add a CSV export of one month's orders for finance, next to the warehouse XML export in src/exports. To skip the questions: finance downloads it for the month-end close and it must agree with what we bill; no UI, a function that returns the CSV text is enough; other formats are out of scope; it works when the CSV has one row per order with its id, date, and total. Call the plan csv-export.
