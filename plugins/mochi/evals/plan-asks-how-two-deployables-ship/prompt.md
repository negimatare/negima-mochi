---
description: Planning a change to an API field that the web app in the same repo reads asks whether the API and the web app deploy together before it writes a plan with a compatibility step, and writes no code. The skill without its deploy question asks too, but only at the hand-over of a written plan.
tags: [plan]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build send the checkout total in cents. The checkout response's `total` (euros, a float) becomes `totalCents`, an integer, and the web app shows it as before. To skip the other questions: rounding errors on floats make support refund one cent now and then; no other field changes; it works when a cart of 19.99 gives `totalCents` 1999 and the web app still shows "19.99". Call the plan total-cents.
