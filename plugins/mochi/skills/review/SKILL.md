---
name: review
description: Review a change (a PR, a branch, or uncommitted work) area by area — split by language or stack, one area at a time, in priority order — with parallel reviewers, a verification pass on blocking findings, and a findings file that survives across sessions. Use when the user asks to review a PR or a set of changes.
argument-hint: "[PR number | branch | nothing for the current branch] [scope notes in plain words]"
---

# Review

The user's arguments: `$ARGUMENTS`

Read them as plain words. They may contain: the change to review, areas or
paths out of scope, areas already reviewed, a priority order, and a feature to
use as inspiration. Anything they leave out takes the defaults below — do not
ask for what has a default.

## 1. Resolve the change

- **PR number or URL**: `gh pr view <n> --json number,baseRefName,headRefName`.
  Reviewers read the working tree, so if the PR's head branch is not checked
  out, ask the user before running `gh pr checkout <n>`.
- **Branch name**: diff it against its merge base with the default branch, or
  with the base branch the arguments name (a part stacked on another one).
- **Nothing**: the current branch against the default branch, plus uncommitted
  changes. When no commit is ahead of the default branch, the change is only
  the uncommitted files: before splitting them into areas, ask in one question
  whether to review those files or to audit the code as it stands with
  `/mochi:refactor <area>`.
- **Code as it stands** (a folder or the whole tree, with no change to diff):
  that is an audit, not a review. Point the user to `/mochi:refactor <area>`
  and stop.

Find the default branch with `git symbolic-ref refs/remotes/origin/HEAD`; never
assume `master` or `main`. Drop every path the user put out of scope.

Then check that the branch is current: run `git fetch` and, when the
checked-out branch has an upstream or is the PR's head,
`git rev-list --count HEAD..@{u}`. If it is behind, stop before reviewing:
say by how many commits, and ask in one question whether to pull first or
review the local head. If the fetch fails or there is no upstream, say so in
one line and review the local head without asking. Never pull, reset, stash,
or switch the user's branch without asking.

## 2. Resume before reviewing

The findings file is `.reviews/REV-<YYYYMMDD>-<id>.md` under the repository
root (`git rev-parse --show-toplevel`), for example
`.reviews/REV-20261105-2309.md`. The date is the day the review starts
(`date +%Y%m%d`), and `<id>` is the pull request number. With no pull
request yet, `<id>` is the branch name after its `<type>/`, the slug its plan
carries (`feat/shipping-fee` gives `shipping-fee`). Never another name: no
other prefix, no round or area suffix, one file per pull request. It stays
out of `.claude/`, where every write needs a permission prompt.

Look for the file by its `<id>` with any date:
`ls .reviews/REV-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-<id>.md`, first by
the pull request number, then by the branch name. If it exists, read it and
continue from its open findings and its next area instead of reviewing again
from scratch; keep its date. A file found by the branch name when the pull
request now exists moves to its number, with its date kept. If `.reviews/` is
not ignored by git (`git check-ignore -q .reviews/`, with the trailing slash:
without it, a folder that does not exist yet reads as not ignored), tell the
user once.

## 3. Split into areas

Group the changed files by stack — language plus the top-level directory that
owns them (for example "Python — service/", "React — web/", "TypeScript — server/").
Order the areas by the user's priority if they gave one. Otherwise propose an
order — server code that guards data first, shared code next, UI last — and
confirm it with the user in one question before starting.

Review **one area at a time**. Stop after each area and wait for the user.
For an area the user says was already reviewed, only look at the files they
name as still needing review.

## 4. Review the area

Write the area's diff to one file so reviewers do not each recompute it:
`git diff <base>...HEAD -- <area files> > "$TMPDIR/review-<area>.diff"`
(append `git diff -- <area files>` for uncommitted work).

Then pick the tier. Count the area's changed lines, added plus removed, with
`git diff --numstat` over the same ranges and files as the diff file,
leaving out lockfiles and generated files. The area is **small** under 80 lines when its diff reaches
no trust boundary: database access, auth or permissions, a route or request
handler, or what a published package exports (as the "Libraries" item of
`${CLAUDE_PLUGIN_ROOT}/agents/hygiene-reviewer.md` defines one). An area the user asks a full review for is never small. Say in
one line which tier each area got, and why.

Launch these agents in parallel, in one message, each with `subagent_type`
set to the name shown: a general-purpose agent does not have their
instructions. Never review the area yourself instead, however small.

- A small area: `mochi:001-shamed-instrument` (quick reviewer), which applies
  the correctness, test, and hygiene checklists in one pass.
- Any other area: `mochi:117649-despondent-pyre` (correctness reviewer),
  `mochi:049-abject-testament` (test reviewer), and
  `mochi:2401-penitent-tangent` (hygiene reviewer).
- When the caller says the `tidy` skill already ran on every commit of the
  change, as `/mochi:build` does, tell the hygiene or quick reviewer so: tidy
  has removed dead code and fixed naming, so it checks only what tidy does
  not.
- `mochi:031-exuberant-witness` (data reviewer) when the area's diff touches
  database access: SQL, ORM queries or models, migrations, or schema files.
  Tell the correctness reviewer that queries and their cost are covered.
- Every reviewer agent from an installed stack plugin whose description matches
  the area's stack (for example a React conventions reviewer for `.tsx` files)
  and whose `Runs only when` condition, if its description gives one, holds
  for the area's diff. When unsure whether it holds, launch it. Skip the
  others; say which ran and which were skipped.
- `mochi:859-static-carillon` (accessibility reviewer) when the area changes
  markup (templates, components, HTML) and none of the stack reviewers
  launched for it reviews accessibility. A stack plugin's accessibility
  reviewer knows its component library, so it replaces this one.

Start each launch's task description with the reviewer's role, for example
`correctness reviewer — Python service/`, so the transcript shows who is doing
what. Give each reviewer: the diff file path, the area's file list, the
`CLAUDE.md` path of the package that owns the area (the nearest one above its
files), the user's notes (inspiration feature, already-reviewed parts), and,
for a pull request, its title and body written to
`$TMPDIR/review-<pr number>-description.md`.

When the area's package has its own manifest (`package.json`,
`pyproject.toml`, `go.mod`) but no `CLAUDE.md`, and the nearest one above it
describes another app or stack, tell the user once that the package is not set
up and suggest `/mochi:setup-project <package>`. Pass the reviewers that file
anyway, saying it was written for another app: a rule it sets only for that
app is not a finding here.
Nothing else — they read what they need.

## 5. Verify before reporting

Verify in depth what would block merging; the rest waits until it is picked.

- For every `must` finding, open the cited code and confirm the claim. Drop
  a finding that does not hold, and say in one line why it was dropped. A
  claim the code cannot settle (a table size, a query plan) keeps its `?`.
- Report `imo` and `nit` findings as the reviewer gave them, without opening
  their code now: they are confirmed in the fix round when the user picks
  them, and before they go into a pull request comment. One that reads as a
  `must` the reviewer under-graded is checked now, like a `must`. The
  mechanism check below still applies to the fix each of them proposes.
- When a `must` finding says a test cannot fail or a guard has no test, and the
  project's `CLAUDE.md` gives a test command that runs that test without a
  build or a service, prove it. First run only the tests of that file as
  they are; if they do not pass, skip the proof. Otherwise save a copy of the
  source file in `$TMPDIR`, apply the change the finding names (or remove
  the guard) to the file in place, run the same tests, then restore the file
  from the copy and check with `cmp` that the two match. Tests that still
  pass confirm the finding; an assertion that fails drops it. A run that
  errors before asserting proves nothing. Say which findings were proven
  this way and which were not run.
- Recheck any number or fact a `must` rests on (a probability, a size, a
  call count) and re-grade the finding if it is wrong.
- Merge findings that point at the same line and the same problem; keep the
  highest severity.
- A finding that only says "a sibling does it differently" is not a finding.
- When a fix brings in a mechanism (a guard, a file layout, a library, a
  pattern), look for how the codebase already handles the same case. If it
  has a sound way, that is the fix you recommend; the new mechanism is at
  most an option after it. If nothing in the codebase does it, say the fix is
  new to it.

## 6. Grade, report, and record

Reviewers label findings `must` (blocks merging), `imo` (a recommendation), or
`nit` (optional), with a trailing `?` when unsure. Turn each `must` that
survived verification, and each `imo` and `nit`, into a grade, by its
consequence in the code:

| Grade | From | When |
|---|---|---|
| 🔴 Critical | `must` | A security hole, data loss, or a crash or wrong result on a path most users take. |
| 🟠 High | `must` | Any other `must`: wrong behaviour on a narrower path, a behaviour that matters left unprotected, code or a comment that misleads. |
| 🟡 Medium | `imo` | Real risk or debt that breaks nothing today. |
| 🔵 Minor | `nit` | Optional polish. |

Critical and High block merging. A `must` that breaks nothing today is Medium,
whatever the reviewer called it. A flaw inherited from existing code is graded
by what it does in this change, like code written here: a wrong result the
change ships is High or Critical even when the code it copied ships it too.
Say it is inherited, and offer to fix both now or the original in a
follow-up. A finding the code could not confirm keeps its `?`, for example
`🟡 Medium?`.

Write or update the findings file in this format, one line per finding:

```markdown
# Review: <PR or branch>
Base: <ref> · Areas: Python ✅, React ▶, Infra ⏸ (out of scope)
Open: 🔴 0 · 🟠 1 · 🟡 0 · 🔵 0
PR comment: <URL> (id <id>)

## Python — service/
- [ ] P-1 🟠 High    service/bots.py:42 — Upstream error is swallowed as an empty 200. Fix: propagate as 502.
- [x] P-2 🟡 Medium  service/bots.py:88 — `start()` both validates and dispatches. Fix: extract `validate_start()`.
- [~] P-3 🔵 Minor   service/models.py:5 — Unused import. (skipped: user)
```

`[ ]` open, `[x]` fixed, `[~]` skipped with the reason. IDs are the area's
initial plus a number and never change. A finding you withdraw after writing
it stays in the file as `[~]` with the reason; never delete its line. The `Open:` line counts the open
findings of every area per grade; update it with the checkboxes.

Then show the user, in this order: one line on what the area does well, the
`Open:` counts, the findings grouped 🔴 Critical → 🟠 High → 🟡 Medium →
🔵 Minor with each line starting with its grade, and the dropped findings in
one line each. Say in one line that the Medium and Minor findings are as the
reviewers reported them and are checked against the code before any is
fixed. Do not paste the reviewers' full output.

## 7. Fix round

Fix what the user picks, offering the Critical and High findings first.
Before fixing a Medium or Minor finding, confirm it as step 5 does for a
`must`; one that does not hold is marked `[~]` with the reason. After
the fixes, run the verification commands listed in the project's `CLAUDE.md`,
update the checkboxes and the `Open:` line in the findings file, and move to
the next area only when the user says so.

## 8. Comment on the pull request

When the change is a pull request, end the report by offering once to post
the open findings on it as one comment. The comment holds the scope reviewed,
one line on what works, then the findings grouped by grade like the report,
each with its ID, `path:line`, problem, and fix, and anything the pull request
description gets wrong. Confirm each Medium or Minor finding it includes,
as the fix round does, unless you already confirmed it in this session, and
leave out one that does not hold. Show the user the full comment and post it only after
they approve it, even when they asked for the comment themselves. Post it with
`gh pr comment <n> --body-file <file>`, give the user its URL, and record the
URL and its id on the findings file's `PR comment:` line, so a later session
can find it. Leave that line out until a comment exists. When findings are
later skipped or fixed, edit that comment
(`gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id> -F body=@<file>`)
instead of posting another; say what changes in it before editing.
