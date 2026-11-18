---
name: refactor
description: Restructure existing code in an area (a package, a folder, or a feature) against the project's rules — audit it with the reviewers and the tidy checks, let the user pick what is worth fixing, and plan behaviour-preserving refactors that /mochi:build implements. Use when the user asks to refactor, restructure, clean up, or pay down debt in existing code, not only the current change.
argument-hint: "[area: folder, package, or feature] [goal or constraints in plain words]"
disable-model-invocation: true
---

# Refactor an area

The user's arguments: `$ARGUMENTS`

Find what in an area costs the most today, let the user choose, and turn each
choice into a plan that keeps behaviour unchanged. This skill writes no
production code: `/mochi:build` implements each plan.

## 1. Scope

- **Area**: the folder, package, or feature in the arguments. With none, or
  one too vague to resolve to folders, ask. List its files with
  `git ls-files <paths>`, without generated files, lockfiles, and vendored
  code. Over about 50 source files, propose sub-areas and ask which comes
  first, with one option to audit them all, one after another. With all,
  stop for the pick only once, after the last sub-area, with every
  sub-area's candidates in one ranked list.
- **The bar**: the area's `CLAUDE.md` and the ones above it, the stack
  plugins' skills, and the mochi principles. Existing code is not the bar.
- **Clean start**: uncommitted changes in the area go back to the user, to
  commit or stash first. The audit must see the code as it is, and each
  refactor must be revertible on its own.

## 2. Resume before auditing

The audit file is `.reviews/REF-<YYYYMMDD>-<area-slug>.md` under the
repository root (`git rev-parse --show-toplevel`), for example
`.reviews/REF-20261105-api-billing.md` for `api/billing`. The date is the day
the audit starts (`date +%Y%m%d`). Never another name: no other prefix, no
round suffix. Look for it by its area with any date:
`ls .reviews/REF-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-<area-slug>.md`. If
it exists, read it, keep its date, and continue from its open candidates
instead of auditing again. If `.reviews/` is not ignored by
git (`git check-ignore -q .reviews/`, with the trailing slash: without it, a
folder that does not exist yet reads as not ignored), tell the user once.

## 3. Audit

Write the file list to `$TMPDIR/refactor-<area-slug>.files`, then launch
these agents in parallel, in one message, each with `subagent_type` set to
the name shown: a general-purpose agent does not have their instructions.

- `mochi:117649-despondent-pyre` (correctness reviewer),
  `mochi:049-abject-testament` (test reviewer), and
  `mochi:2401-penitent-tangent` (hygiene reviewer).
- `mochi:031-exuberant-witness` (data reviewer) when the area holds database
  access: SQL, ORM queries or models, migrations, or schema files. Tell the
  correctness reviewer that queries and their cost are covered.
- Every reviewer agent from an installed stack plugin whose description
  matches the area's stack and whose `Runs only when` condition, if its
  description gives one, holds for the area's files. When unsure, launch it.
  Say which ran and which were skipped.
- `mochi:859-static-carillon` (accessibility reviewer) when the area holds
  markup (templates, components, HTML) and none of the stack reviewers
  launched for it reviews accessibility.

Start each task description with the role and `audit`, for example
`hygiene reviewer — audit api/billing`. Give each reviewer: the file list
path, the area's `CLAUDE.md` path, and the user's goal. Nothing else.

While they run, apply the checks of the tidy skill
(`${CLAUDE_PLUGIN_ROOT}/skills/tidy/SKILL.md`, section 2) to the whole area
instead of to a change: duplication, naming, shotgun surgery, dead code,
tests, file size.

Confirm the findings as `/mochi:review` does: open the cited code of every
`must` now, and drop a finding that does not hold, saying why in one line.
The `imo` and `nit` findings are confirmed when the user picks the candidate
they belong to, before it is planned. One that reads as a `must` the
reviewer under-graded, such as wrong behaviour, is checked now, like a
`must`.

## 4. Group into candidates

Merge the findings into refactor candidates, one concept each. For each one:

- **Cost today**: the change it makes harder or the bug it invites, in one
  line. A rule broken at no cost goes to the "later" list, not to the
  candidates.
- **Files** and the production subsystems they cross.
- **Pinning tests**: whether existing tests protect the behaviour it touches
  — covered, partly, or none. "None" makes the refactor more expensive; say
  so.
- **Size**: S (one file or seam), M (a few files, one subsystem), or L
  (crosses subsystems).

A finding where behaviour is wrong is a bug, not a refactor: list it apart for
`/mochi:fix-bug`.

Grade every item on the scale `/mochi:review` uses:

- **Bugs**: 🔴 Critical for a security hole, data loss, or a crash or wrong
  result on a path most users take; 🟠 High otherwise.
- **Candidates**, by cost today: 🟠 High when it invites a bug in data, money,
  or access, or taxes every change to the area; 🟡 Medium otherwise.
- **Later**: 🔵 Minor.

Rank the candidates by grade, then the smaller size first.

Write the audit file:

```markdown
# Refactor audit: <area>
Base: <commit> · Goal: <the user's goal, or "general health">
Open: 🔴 1 · 🟠 1 · 🟡 1 · 🔵 1

## Bugs, for /mochi:fix-bug
- 🔴 Critical  api/billing/refund.py:88 — Partial refunds round in the customer's disfavour.

## Candidates
- [ ] R-1 🟠 High · M    Discount rules live in three handlers — each pricing change edits all three. Files: api/billing/{cart,invoice,refund}.py. Pinning: partly.
- [ ] R-2 🟡 Medium · S  invoice.py is 640 lines with two concepts. Files: api/billing/invoice.py. Pinning: covered.

## Later
- R-3 🔵 Minor  api/billing/utils.py:12 — Name mixes layers; no change touches it soon.
```

`[ ]` open, `[p]` planned, `[x]` done, `[~]` skipped with the reason. IDs never
change. The `Open:` line counts the bugs, the open candidates, and the later
items per grade.

Show the user the `Open:` counts, the bugs, the candidates in rank order, each
line starting with its grade, and the dropped findings in one line each. Say
in one line that the findings behind Medium and Minor items are as the
reviewers reported them and are checked when the user picks a candidate. This
is the **first stop**: the user picks the candidates.

## 5. Plan

First confirm the `imo` and `nit` findings behind the picked candidates
against the code. A candidate left with no finding that holds is marked
`[~]` with the reason, and the user hears why.

Group the picked candidates: candidates that can be accepted or reverted
without each other get separate plans. Run the `plan` skill once per group,
with the request "refactor: <candidates>; behaviour must not change" and the
audit file path. Each plan's approval is the **next stop**.

Ask before planning a size L candidate: it needs coordinated edits across
subsystems, so describe the files, why a narrower refactor would be
incomplete, and the risk.

Mark planned candidates `[p]` in the audit file.

## 6. Hand over

Report, briefly:

- the audit file path and the candidates left open;
- the plans written, in the order to build them, each with its command:
  `/mochi:build .plans/<date>-<slug>.md`;
- the bugs found, for `/mochi:fix-bug`.

Build one plan at a time. Each build commits and pushes its own slices, so
each refactor can be reverted on its own.
