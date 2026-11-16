---
name: fix-bug
description: Fix a bug test-first — clarify it, find the cause in code that actually runs, reproduce it with a failing test before touching the implementation, then make the minimal fix. Use when the user reports a bug, an error, a regression, or something that "doesn't work".
argument-hint: "[what is broken: steps, expected, actual]"
---

# Fix a bug

The report: `$ARGUMENTS`

No implementation code changes before a test reproduces the bug.

## 1. Clarify

You need the steps that trigger it, what was expected, what happened instead
(error text, screenshot, logs), and where (environment, browser, which user or
role). Ask once for whatever the report leaves out. Several bugs in one report
are handled one at a time, in an order the user agrees.

## 2. Find the cause

Trace the path from the app's entry point to the failing behaviour, and cite
`path:line`. A file that exists, or code that only tests call, proves nothing
about what runs — check it is actually mounted, registered, or called. State
the cause as a hypothesis until the test confirms it.

## 3. Reproduce it

Write a test that fails **because of the bug**, at the lowest level that can
show it (the project's `CLAUDE.md` decides levels). Run it and read the
failure: it must describe the wrong behaviour, not a typo or a missing fixture.

If it passes, adjust it — at most twice. Still passing, or the bug only happens
in an environment a test cannot reach: add temporary logging on the suspected
path (never user or client data), ask the user to reproduce and share the
output, find the cause from it, and then write the test.

## 4. Report — and wait, unless asked to fix

Give the cause with `path:line`, the reproducing test and its failure, and the
minimal fix you propose. If the user's request already asked for the fix, go
on; otherwise stop for their decision.

If the right fix changes more than one place or changes what the user sees,
say so and suggest `/mochi:build` instead of patching around it.

## 5. Fix

One minimal change. The reproducing test passes, then the project's
verification commands pass. Remove any temporary logging. Do not change other
tests to make them pass without saying which and why.

Run the `tidy` skill if the fix left duplication behind. Then run the
`commit` skill with "push": the fix becomes one `fix` commit on a feature
branch. Suggest `/mochi:review`, then `/mochi:pr`.
