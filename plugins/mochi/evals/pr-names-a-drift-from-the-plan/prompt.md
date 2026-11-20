---
description: Drafting a pull request for a branch whose plan puts the shipping-fee rule in a new pricing module. The diff puts it in the cart, and a commit message gives the reason but does not name the plan. The Why says that the code departs from the plan, and why. It passes with the pr skill of 3875a29 on Sonnet, so it guards against a regression only.
tags: [pr]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:pr
