---
name: build
description: Take a change from request (or from an approved plan file in .plans/) to a pushed feature branch in one flow — plan (when the change needs one and has none), implement slice by slice (test first, tidy, commit, push), then review area by area and fix — stopping for the user only to approve the plan, to choose whether to review in a fresh session, and to pick which findings to fix. Never pushes the default branch or opens the pull request. Use when the user asks to build, implement, or ship a feature or change end to end.
argument-hint: "[what to build, or a .plans/ file path, plus anything already decided]"
disable-model-invocation: true
---

# Build

The user's request: `$ARGUMENTS`

Run the steps in order. The `plan`, `tidy`, and `commit` skills run with the
Skill tool. The user can skip a step by saying so in the request.

## 1. Plan — or say why not

When the request names a plan file in `.plans/`, written by an earlier build
or by `/mochi:refactor` and approved by the user: read it, skip planning, and
go to step 2. A plan path that does not exist goes back to the user. A plan
with more than six slices, or whose slice estimates add up to more than about
400 lines, is too big for one pull request to review well, and
one whose slices must reach production at different times (its Risks name a
deploy order between deployables that do not deploy together, a migration
that must land first, or a clean-up that waits for every client) cannot
keep that order in one pull request. Say which applies, suggest
`/mochi:split <plan path>`, and build it whole only when the user says so.

A plan split by `/mochi:split` is an index of parts: send the user to its
parts, built one at a time. A part that says `Build after part <n>` waits for
that part's pull request to be merged. Its branch ends in that part's file
name; check with `gh pr view <branch> --json state`, which also sees squash
merges, and ask the user when `gh` cannot tell. Not merged: stop and say so.
Merged: the code under this part has changed, so challenge it again: launch
the bar-raiser on it as the `plan` skill's step 4 does
(`${CLAUDE_PLUGIN_ROOT}/skills/plan/SKILL.md`), and wait for the user to
approve it before step 2.

A part that says `Stacked on part <n>` is built on part n's branch, found the
same way. Part n's pull request is merged: build this part as above, from the
default branch. Part n's branch is not pushed: stop and say part n comes first.
Otherwise this part's **base** is part n's branch: `git fetch`, switch to it,
and pull. Then launch the bar-raiser on this part and wait for the user's
approval, as above.

Otherwise, run the `plan` skill when the request asks for a plan or names
one, the change touches more than one place, the design is not obvious, or
the request leaves the need unclear. Skip planning only for a change
confined to one place with an obvious design. Then state, before writing
code, the one or two behaviours that prove it works, and go on: they form a
single slice.

The plan's hand-over is the **first stop**: wait for the user to approve the
plan. End the hand-over by offering a fresh start: approve here, or run
`/clear` and then the command you give in full, which builds it without the
planning in context — `/mochi:build .plans/<date>-<slug>.md`, followed by
anything the request decided for the build, such as a step to skip. When the
hand-over suggests `/mochi:split`, offer `/mochi:split .plans/<date>-<slug>.md`
instead. The same command resumes it in a later session.

## 2. Implement slice by slice

Take the slices in the plan's order. For each one:

1. **Test first.** Write the slice's failing tests. Run them and confirm they
   fail **because the behaviour is missing**, with a message that says so; a
   failure from a typo, an import, or a missing fixture does not count.
   In a refactor plan (one whose Acceptance says behaviour must not change)
   nothing is missing: write the pinning tests the slice lists that do not
   exist yet, and confirm they **pass on the current code** before changing
   it.
2. **Code.** Write the code that makes them pass, following the plan.
   Pinning tests pass without edits. When `.plans/<date>-<slug>.view.json`
   has screens, the UI matches their `after` views and reuses the components
   they name.
3. **Verify.** Run the project's verification commands from its `CLAUDE.md`,
   all passing. On the last slice that changes the UI or how the app
   starts (its entry point, its startup config or wiring), also run the
   `## Runtime check` command of that `CLAUDE.md`, when it has one, with
   `OUT="$TMPDIR/runtime-<slug>"`. Read the log, look at the screenshots
   of the screens the change touches, and say in one line what they show.
   A failing exit, an error in the log, or a screen that shows the change
   wrong fails the slice. When the driver cannot reach the changed state
   (an error state, a dialog, a hover), say so in one line; that does not
   fail the slice, and the driver is not changed to reach it.
4. **Tidy.** Run the `tidy` skill with the plan path. If it stops to ask
   about a cross-subsystem refactor, that question goes to the user before
   continuing.
5. **Commit and push.** Run the `commit` skill with "slice <n>: <slice>;
   push". The slice becomes one commit on the feature branch. Do not create
   or switch branches yourself: on the default branch, the first commit
   creates the feature branch with the name `commit` gives it. For a
   stacked part, add "; stacked on <base>", so that the first commit creates
   this part's branch from the base and leaves the base alone.

Throughout: do not change a test to make it pass without saying which and
why. If the plan turns out wrong (a fact does not hold, a step does not work),
stop and tell the user what broke and what you propose. Do not silently build
something else.

## 3. Review and fix

**First, offer a fresh session.** With more than one slice built, the
slices fill the context the review would carry. Unless the request already
says to review here, stop after the last slice. Give step 4's hand-over
first, all but what the review will change, and mark the audit candidates
there, since a fresh session will not come back to it. Then ask in one
question: review here, or run `/clear` and then the command you give in
full — `/mochi:review <branch>`, with `against <base>` for a stacked part,
`for a build of <plan path>`, `the tidy skill ran on every slice` when it
did, and `commit and push each area's fixes`. Give the command after it
too: `/mochi:pr`, or `/mochi:pr <base>` for a stacked part. Wait for the
answer before reviewing.

To review here, run `/mochi:review` on the feature branch, with
`for a build of <plan path>`: a fix for code of the part below then stays
on this part. When the `tidy` skill ran on every slice, tell it so; not
when the user skipped it. For a stacked part, review it against its base,
so that the review sees only this part.
Its report for each area is the **second stop**: the user picks which
findings to fix. Fix those, rerun the verification commands, run the `commit`
skill with "review fixes; push", and move to the next area when the user says
so.

## 4. Hand over

When step 3 already gave this hand-over before the review, report only what
the review changed, the findings left open, and the next step. Otherwise
report, briefly:

- what was built, against the plan's Acceptance;
- the feature branch and its commits, all pushed;
- the tests added, and the verification commands with their results;
- what the tidy steps and the review changed, and the findings left open;
- manual checks the project's `CLAUDE.md` requires (for example a two-client
  smoke test), still to do;
- the next step: `/mochi:pr` opens the pull request; for a stacked part,
  `/mochi:pr <base>`, so that it targets the part below.

When the plan names a refactor audit file in `.reviews/`, mark the candidates
it implemented as done there.

Remind the user that the plan's files in `.plans/` are deleted once the change
is merged.
