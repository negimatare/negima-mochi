# Workflows

Each `/mochi:*` command, what it does, and where it stops for you. For an
overview, see the [README](../README.md).

- [`/mochi:setup-project`](#mochisetup-project)
- [`/mochi:build`](#mochibuild)
- [`/mochi:refactor`](#mochirefactor)
- [`/mochi:fix-bug`](#mochifix-bug)
- [`/mochi:review`](#mochireview)
  - [Grades](#grades)
- [`/mochi:pr`](#mochipr)
- [`/mochi:split`](#mochisplit)
- [Branches and commits](#branches-and-commits)
- [A frontend and a backend in one repository](#a-frontend-and-a-backend-in-one-repository)

## `/mochi:setup-project`

Run it once per project or package, and again when its tooling changes.

It reads the stack, the lockfile, the typecheck, lint, and test commands, the
instructions in folders above, and the rules of the matching stack plugin.
Then it asks at most four questions about what the code cannot tell, such as
decisions a newcomer would get wrong or areas another team owns. It shows you
a short `CLAUDE.md` and writes it once you agree. The file holds only what is
specific to the project, nothing the plugins already say.

Finally it runs every command the file lists, to prove they work, and makes
git ignore `.plans/` and `.reviews/`: in `.gitignore` when the team has the
plugins in the committed `.claude/settings.json`, otherwise in the
uncommitted `.git/info/exclude`.

**Lint rules.** When a stack plugin relies on a lint rule the project lacks,
setup proposes adding it. It first runs lint with the rule and reports how
many existing violations it finds. If there are none, it proposes the rule as
an error. If there are any, you choose: an error, with a commented override for
each file that breaks it today, so new code is held to the rule and lint
keeps passing; or a warning.

**Dead code.** The compiler and the linter only see unused code inside one
file. To find exports, files, and dependencies nothing else uses, setup looks
for knip (TypeScript and JavaScript) or vulture (Python). When the project
lacks its stack's tool, setup proposes adding it as a pinned dev dependency,
with a config that names the entry points and framework decorators the tool
cannot find on its own. The command goes in a "Dead-code check" section of
`CLAUDE.md`. Reviews and audits run it; verification does not, so dead code
that already exists never blocks a commit. The kit always runs the installed
copy, never `npx` or `uvx`.

**Repositories with several packages.** Every folder with its own manifest
(`package.json`, `pyproject.toml`, `go.mod`) gets its own `CLAUDE.md`:

```
/mochi:setup-project apps/web
/mochi:setup-project services/api
```

A `CLAUDE.md` higher up the tree always loads too. When it describes another
app or stack, setup adds a "Scope override" section naming the parent
instructions that do not apply. The override only binds Claude: if CI also
enforces one of those rules, setup tells you to scope it at its source.

Start Claude at the repository root, where the plugins are installed, even
for a change inside one package. The package's `CLAUDE.md` loads as soon as
Claude reads its files.

## `/mochi:build`

```
/mochi:build add a CSV export to the orders page; reuse the existing date filter
```

1. **Plan.** Claude asks one round of questions and writes
   `.plans/<date>-<slug>.md`, for example `.plans/20261105-csv-export.md`:
   problem, acceptance scenarios, approach, data flow, verified facts, tests,
   slices, and risks. Before adding a rule, it looks for code that already
   owns it, under any name, and the plan says whether it reuses, changes, or
   extracts that code, or why it adds its own. The bar-raiser challenges it.
   Claude then opens `.plans/<date>-<slug>.html`: a diagram of the data flow
   and, when the change touches the frontend, each changed screen before and
   after, drawn with the product's own styles. **You approve the plan**, with
   the view in front of you. A small change confined to one place skips the
   plan; Claude says why and builds it as one slice.
2. **Build slice by slice.** A slice is one behaviour with its tests. Claude
   writes the failing tests and checks they fail because the behaviour is
   missing. Then it writes the code, runs the verification commands, tidies
   what the slice touched, commits, and pushes.
3. **Review.** The branch is reviewed area by area, and **you pick the
   findings to fix**. Fixes are committed and pushed.
4. **Hand over.** Claude reports what was built, the commits, the tests, and
   the manual checks left. Next: `/mochi:pr`.

The plan stays in `.plans/`. To read it, share it, or build it in another
session, stop after step 1 and resume later:

```
/mochi:build .plans/20261105-csv-export.md
```

When the plan is too big for one pull request, split it before building, as
the next section shows.

## `/mochi:split`

```
/mochi:split .plans/20261105-order-exports.md
```

A part is a whole plan with its own branch and pull request; a slice is one
commit inside a plan. Each slice in a plan carries a rough line count. When a
plan has more than six slices or about 400 lines, or its slices must reach
production at different times (a service before its frontend, a
migration before its readers), the plan step suggests splitting it, and build
asks before building it whole.

1. **Propose.** Claude cuts the plan by outcome, never by layer: each part
   changes something a named person can check, works end to end, and stays
   useful if the later parts never ship. The one exception is a deploy
   order: a backward-compatible step that must ship first, such as a service
   change before its frontend, may be its own part. Every slice and scenario
   goes to exactly one part, and anything that fits none is shown to you as a
   proposed drop. **You accept or change the split, and choose how the parts
   ship**: in order, or stacked.
2. **Write.** Each part becomes
   `.plans/20261105-order-exports-1-monthly-csv.md`, `-2-…`, and so on,
   with the plan's date. The original plan becomes an index of the parts.
3. **Check part 1.** The bar-raiser challenges it, and its view opens.
4. **Build in order.** Run `/mochi:build` on part 1. A later part waits until
   the part before it is merged, and the bar-raiser challenges it again first,
   because the code under it has changed.

**Stacked parts.** Choose stacked when you want reviewers on part 2 while
part 1 is still in review. A stacked part starts as soon as the part below it
is pushed: build branches from that part's branch, reviews only the new
commits, and hands over `/mochi:pr <branch below>`, so the pull request
targets the part below and says to merge that one first. Merge the parts from
the bottom up. After each merge, run `/mochi:pr` on the next part's branch:
it rebases the branch onto the default branch, runs the checks, and asks you
before it force-pushes. It also restacks a part when the part below it gets
new commits during review.

## `/mochi:refactor`

Build tidies the code its change touches. To improve code that no change
touches, start from the area and say what hurts:

```
/mochi:refactor api/billing; pricing changes keep breaking refunds
```

1. **Audit.** The reviewers and the tidy checks go through the whole area
   against your `CLAUDE.md`, the stack conventions, and the principles.
2. **Candidates.** Findings become refactor candidates, each with what it
   costs today, the files it touches, how well tests protect it, and a size.
   Bugs found on the way are listed apart, for `/mochi:fix-bug`. Every item
   carries a [grade](#grades). **You pick the candidates.** The audit is
   saved in `.reviews/REF-<date>-<area>.md`:

   ```markdown
   Open: 🔴 1 · 🟠 1 · 🟡 1 · 🔵 0

   ## Bugs, for /mochi:fix-bug
   - 🔴 Critical  api/billing/refund.py:88 — Partial refunds round in the customer's disfavour.

   ## Candidates
   - [ ] R-1 🟠 High · M    Discount rules live in three handlers — each pricing change edits all three. Pinning: partly.
   - [ ] R-2 🟡 Medium · S  invoice.py is 640 lines with two concepts. Pinning: covered.
   ```

3. **Plan.** One plan per independent group of candidates, each with
   "behaviour must not change" and the tests that pin that behaviour. **You
   approve each plan.**
4. **Build.** Run `/mochi:build .plans/<date>-<slug>.md` for each plan, one
   at a time. Build writes any missing pinning tests first and checks they pass
   on the current code, then refactors slice by slice with those tests green.

## `/mochi:fix-bug`

```
/mochi:fix-bug saving a profile with an empty name returns 500 instead of a validation error
```

1. **Clarify.** Claude asks once for what the report leaves out: steps,
   expected and actual behaviour, and where it happens.
2. **Find the cause** in code that actually runs, traced from the app's entry
   point.
3. **Reproduce** it with a test that fails because of the bug. After two
   failed attempts, Claude adds temporary logging and asks you to reproduce
   it.
4. **Report** the cause and the proposed fix. **You decide**, unless your
   request already asked for the fix. A fix bigger than one place goes
   through `/mochi:build` instead.
5. **Fix** with one minimal change, committed and pushed to a feature branch.

## `/mochi:review`

```
/mochi:review 1234 skip infra/; api/ already reviewed except auth.py
```

Reviews a pull request, a branch, or uncommitted work. With no arguments, it
reviews the current branch and its uncommitted changes. The change is split
by stack, for example "Python, api/" and "React, web/", and the areas are
reviewed one at a time, highest risk first. Each area gets the generic
reviewers plus the matching stack plugin's. An area that touches a database
also gets the data reviewer. An area with markup gets an accessibility
reviewer: the stack plugin's when it has one, otherwise the generic one.
**You pick the findings to fix after each area.**

Claude checks every blocking finding against the code before you see it.
Medium and Minor findings are shown as the reviewers reported them, and
checked before they are fixed or posted. When a reviewer says a test cannot
fail, and the test runs without a build or a service, Claude proves it: it
removes the guard in a copy, runs the test, and puts the file back. When your branch is behind the pull request or its
upstream, Claude says so and asks before pulling.

Each finding carries a [grade](#grades), and the report lists the most severe
first. Findings are saved in `.reviews/REV-<date>-<pr number>.md` (the
branch name before the pull request exists), so a later session resumes
instead of starting over. For a pull request, Claude offers to post the open
findings as one comment. **You approve the comment** before it is posted, and
Claude edits that same comment as findings are skipped or fixed.

When a package with its own manifest has no `CLAUDE.md`, review says so and
suggests `/mochi:setup-project` first: the instructions above it may describe
another app. Build runs this step itself; use review on its own for work build
did not produce, such as a teammate's pull request.
To check code as it stands, with no change to review, use `/mochi:refactor`.

### Grades

Reviews and refactor audits grade every finding by its consequence. The
blocking ones are checked against the code first:

| Grade | Means | In a refactor audit |
|---|---|---|
| 🔴 Critical | A security hole, data loss, or a crash or wrong result on a path most users take. Blocks merging. | Bugs only |
| 🟠 High | Wrong behaviour on a narrower path, a behaviour that matters left untested, or code that misleads. Blocks merging. | Bugs, and candidates that invite a bug in data, money, or access, or tax every change |
| 🟡 Medium | Real risk or debt that breaks nothing today. | Other candidates |
| 🔵 Minor | Optional polish. | The "later" list |

The findings file opens with a count of what is still open, such as
`Open: 🔴 0 · 🟠 2 · 🟡 5 · 🔵 3`. A flaw copied from existing code gets the
grade of what it does in the change, as if it were new. A trailing `?`, as in
`🟡 Medium?`, marks a finding the code alone could not confirm, such as one
that rests on a table's size.

## `/mochi:pr`

Writes the pull request body from the final diff: a TL;DR, why, risk, how to
review, review asks, and a manual test plan. It adds self-review comments at
the risky lines. **You approve the body and the comments**, then it opens the
pull request as a draft, and marks it ready only when you say so.

On a stacked part's branch, it targets the part below and restacks the branch
when the part below moves or merges, as [stacked parts](#mochisplit)
describes.

## Branches and commits

- Build and fix-bug commit through one internal step. It pulls first, stages
  files by explicit path, runs the verification commands, and writes a
  Conventional Commit message that explains why.
- On the default branch, the first commit creates a feature branch named
  `<type>/<slug>`, such as `feat/csv-export`; a stacked part's first commit
  creates it from the part below. Nothing is pushed to the default branch,
  and nothing is force-pushed except a stacked part's own branch, when you
  agree to a restack.
- To commit work you edited yourself, ask Claude to commit it. The same rules
  apply, and it pushes only when you ask.

## A frontend and a backend in one repository

A repository has a React + Fluent UI frontend in `apps/web`, a FastAPI backend
in `services/api`, and a root `CLAUDE.md` that describes another app.

```bash
# From the repository root
claude plugin install mochi@negima-mochi --scope local
claude plugin install mochi-react@negima-mochi --scope local
claude plugin install mochi-python@negima-mochi --scope local
claude
```

```
/mochi:setup-project apps/web
/mochi:setup-project services/api
/mochi:refactor apps/web/src/features/checkout; every cart change breaks the summary
/mochi:build .plans/20261105-checkout-cart-state.md
/mochi:pr
```

During setup, confirm which parts of the root `CLAUDE.md` do not apply to
each package. In `apps/web`, the `mochi-react` hooks lint each edit and run
`typecheck` and `test`, and the React reviewers join each review. In
`services/api`, the `mochi-python` hooks run Ruff on each edit and the type
checker, import-linter, and pytest from its virtualenv, and the Python
conventions and API contract reviewers join each review. Each plugin's hooks
leave the other package alone.
