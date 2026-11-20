---
description: Planning a change to favorite colors, asked in US spelling in a codebase with a favoriteColor field and US comments, writes the plan prose in UK spelling ("favourite" or "colour", and no "favorite", "color", "organize" or "behavior" outside code and quotes) and keeps the identifier favoriteColor exact, in backticks.
tags: [plan]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/mochi:build plan a summary of the favorite colors in a team: a function that takes the members and a team name and returns how many members of that team picked each color. To skip the questions: the team leads use it to organize the colors of their team page; no UI, the function is enough; members without a color are left out of the summary; it works when a team with two teal members and one gray member gives teal 2 and gray 1. Call the plan team-summary.
