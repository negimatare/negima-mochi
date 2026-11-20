---
name: tidy
description: Tidy the concepts the current uncommitted change touches — collapse duplication, fix naming, remove comments that restate the code, give each rule one home, remove dead code, consolidate tests, split oversized files — without changing behaviour, then rerun only the tests the edits could break. Use after implementing a change and before reviewing or committing it. To restructure existing code that no change touches, use /mochi:refactor.
argument-hint: "[optional: plan path or notes on what the change is for]"
user-invocable: false
---

# Tidy the current change

The user's notes: `$ARGUMENTS`

Make the code the current change touches cohesive and clearly named, with
observable behaviour unchanged. Do not commit, and do not start new work.

## 1. Scope

Run `git status`, `git diff`, and `git diff --cached`. With no uncommitted
change, report "nothing to tidy" and stop; to restructure existing code,
point the user to `/mochi:refactor <area>`.

The change sets the scope, but a concept it touches is followed into untouched
code that repeats the same knowledge or must change for the concept to stay
coherent. Unrelated cleanup found on the way is mentioned, not done. A plan
(if given) can justify keeping code the next step needs; it cannot justify
speculative code.

## 2. Decide before editing

One read-only pass through the checks below, in order. For each candidate,
note the problem the change introduced or made worse, the smallest complete set
of files that fixes it, and the production subsystems it would touch.

1. **Duplication** — knowledge repeated across handlers, components, or
   parallel representations, including a copy that already existed. Give the
   rule one home, reusing an existing seam when one owns it. A helper that
   leaves the callers still repeating the rule is not a fix.
2. **Naming and comments** — names that mislead, mix layers, or leak delivery
   order (step numbers, `V2`, story names). Name by capability, in the
   project's domain vocabulary. In the change, delete each comment that the
   **Comments** section of `${CLAUDE_PLUGIN_ROOT}/principles.md` does not
   allow: for example one that restates the code, a one-time setup note, a
   plan-step name, or a "do not change" warning, also one that gives a reason.
   When the deleted comment says something the code does not, rename,
   extract, or name a constant so that the code says it. A neighbour's comment
   style is no reason to keep one.
3. **Shotgun surgery** — one concept (a value, a rule, a format) that forces
   edits in many places. Consolidate it behind one constant, config, or module.
4. **Dead code** — no caller, unreachable branches, edits that cancel each
   other, flags that never flip, and production code only tests or
   commented-out code call. Remove a commented-out caller with the code it
   calls.
5. **Tests** — tests of internal structure replaced by behaviour at a stable
   boundary; overlapping cases consolidated only when the behaviour they prove
   survives at lower cost. Never delete the only proof of a behaviour.
6. **File size** — a changed file over the project's limit (its linter's
   file-length rule, such as ESLint `max-lines`; else its `CLAUDE.md`; else a
   loaded stack skill's limit; else 250 lines) is split if it has a cohesive
   seam, one concept per module.
   No seam, no split: say so instead of cutting arbitrarily.

Stack conventions apply on top: when a stack plugin's skills are in context,
refactor toward them.

**Stop and ask** before a refactor that needs coordinated production edits in
more than one subsystem (for example the API and the UI, or two feature
slices). Describe the concept, the files, why a narrower change would be
incomplete, and the risk. Tests and fixtures following one seam are not a
crossing. If the crossing only shows up mid-edit, undo your edits for that
candidate before asking.

With no candidates, report "already clean" and stop without running tests.

## 3. Edit and verify

Apply the candidates in check order. When an edit affects a generated file,
such as an API client or schema types, rerun its generator and check what
imports it; never edit generated output by hand. Then run only the focused
tests covering the code you changed — not the full suite, which the project's
hooks or verification commands own. Fix any failure your refactor caused;
report any other failure instead of claiming success.

## 4. Report

- What changed, per check, with paths; files renamed, split, or deleted.
- What you found but left alone, and why.
- The test commands run and their result, or "no edits, no tests".
- Any stop-and-ask decision waiting on the user.
