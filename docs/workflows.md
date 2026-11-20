# Workflows

This document gives the steps of each `/mochi:*` command, and the points where
each command stops for your decision. For an overview, see the
[README](../README.md).

- [`/mochi:setup-project`](#mochisetup-project)
- [`/mochi:build`](#mochibuild)
- [`/mochi:split`](#mochisplit)
- [`/mochi:refactor`](#mochirefactor)
- [`/mochi:fix-bug`](#mochifix-bug)
- [`/mochi:review`](#mochireview)
  - [Grades](#grades)
- [`/mochi:pr`](#mochipr)
- [Branches and commits](#branches-and-commits)
- [A frontend and a backend in one repository](#a-frontend-and-a-backend-in-one-repository)

## `/mochi:setup-project`

Run this command one time for each project or package. Run it again when the
tools of the project change.

1. **Read.** The command reads these items:
   - The stack and the lockfile.
   - The typecheck, lint and test commands.
   - The instructions in the parent folders.
   - The rules of the applicable stack plugin.
2. **Ask.** It asks a maximum of four questions about the data that the code
   cannot give. Examples are decisions that a new team member can get wrong,
   or areas that a different team owns.
3. **Write.** It shows you a short `CLAUDE.md`. When you agree, it writes the
   file. The file contains only the data that is specific to the project. It
   does not repeat the rules of the plugins.
4. **Check.** It runs each command in the file, to make sure that the command
   works.
5. **Ignore.** It tells git to ignore `.plans/` and `.reviews/`. When the team
   has the plugins in the committed `.claude/settings.json`, it uses
   `.gitignore`. If not, it uses `.git/info/exclude`, which is not committed.

**Lint rules.** When a stack plugin needs a lint rule that the project does not
have, setup proposes the rule. First, it runs lint with the rule and
tells you the number of violations in the current code:

- If there are no violations, it proposes the rule as an error.
- If there are violations, you select one of two options:
  - An error, with a commented override for each file that breaks the rule
    now. New code must obey the rule, and lint continues to pass.
  - A warning.

**Dead code.** The compiler and the linter find unused code only inside a single file.
To find exports, files and dependencies that nothing uses, setup looks for
knip (TypeScript and JavaScript) or vulture (Python):

- When the project does not have the tool for its stack, setup proposes it as
  a pinned dev dependency. The configuration gives the entry points and the
  framework decorators that the tool cannot find without help.
- The command is in a "Dead-code check" section of `CLAUDE.md`.
- Reviews and audits run this command. Verification does not run it, so dead
  code that is already in the project does not stop a commit.
- The kit always runs the installed copy of the tool. It never uses `npx` or
  `uvx`.

**Repositories with many packages.** Each folder with its own manifest
(`package.json`, `pyproject.toml`, `go.mod`) gets its own `CLAUDE.md`:

```
/mochi:setup-project apps/web
/mochi:setup-project services/api
```

A `CLAUDE.md` higher in the tree always loads too. When it describes a
different app or stack, setup adds a "Scope override" section. This section
lists the instructions from the parent that do not apply. The override applies only to
Claude. If CI also enforces one of those rules, setup tells you to change the
scope of the rule at its source.

Start Claude at the root of the repository, where the plugins are installed.
Do this also for a change in one package. The `CLAUDE.md` of the package loads
when Claude reads the files of the package.

## `/mochi:build`

```
/mochi:build add a CSV export to the orders page; reuse the existing date filter
```

1. **Plan.** Claude asks one round of questions. Then it writes
   `.plans/<date>-<slug>.md`, for example `.plans/20261105-csv-export.md`. The
   plan contains:
   - The problem and the acceptance scenarios.
   - The approach and the data flow.
   - The verified facts and the tests.
   - The slices and the risks.

   Before Claude adds a rule, it looks for code that already owns the rule,
   also when that code has a different name. The plan tells you if it uses that code, changes it or
   extracts it. If Claude adds its own code, the plan gives the reason. The
   bar-raiser examines the plan.

   Then Claude opens `.plans/<date>-<slug>.html`. This view shows a diagram of
   the data flow. For a change to the frontend, it also shows each changed
   screen before and after the change, with the styles of the product. **You
   approve the plan** while you look at the view.

   A small change in one location does not need a plan. Claude tells you why,
   and it builds the change as one slice.
2. **Build the slices.** A slice is one behaviour with its tests. For each
   slice, Claude does these steps:
   1. It writes the tests.
   2. It makes sure that the tests fail because the behaviour does not exist
      yet.
   3. It writes the code and runs the verification commands.
   4. It tidies the code that the slice changed.
   5. It commits the slice and pushes it.
3. **Review.** If the build has more than one slice, Claude tells you what it
   built. Then it asks where to do the review: in the same session or in a new
   session. For a new session, it gives you the commands: the review first,
   which commits and pushes its fixes, then `/mochi:pr`.

   The reviewers examine the branch one area at a time, and **you select the
   findings to fix**. Claude already tidied each slice, so the hygiene
   reviewer does not search for dead code by hand or check names. It runs the
   dead-code check of the project, and it examines the comments, the docs,
   rename leftovers and scaffolding. Claude commits and pushes the fixes.
4. **Report.** Claude tells you what it built, the commits, the tests and the
   manual checks that you must still do. The next step is `/mochi:pr`.

The plan stays in `.plans/`. You can stop after step 1 and continue later.
This lets you read the plan, share it or build it in a different session. A
new session costs less, because the build starts without the plan step in
its context. For this reason, Claude offers a new session when you approve
the plan:

```
/mochi:build .plans/20261105-csv-export.md
```

If the plan is too big for one pull request, divide it before you build it.
The next section tells you how.

## `/mochi:split`

```
/mochi:split .plans/20261105-order-exports.md
```

A part is a full plan with its own branch and pull request. A slice is one
commit in a plan. The plan gives an estimate of the changed lines for each slice.

The plan step proposes a split in these conditions:

- The plan has more than six slices.
- The slices change more than approximately 400 lines in total.
- The slices must go to production at different times. Examples are a
  service before its frontend, or a migration before the code that reads it.

In these conditions, build also asks you before it builds the full plan.

1. **Propose.** Claude divides the plan by outcome, never by layer. Each part
   obeys these rules:
   - It changes something that a named person can check.
   - It works from end to end.
   - It stays useful if the later parts never ship.

   There is one exception: a backward-compatible step that must ship first
   can be its own part, for example a change to a service before its
   frontend.

   Each slice and each scenario goes to
   exactly one part. If an item fits no part, Claude shows it to you as a
   proposed removal. **You accept or change the split. You also select how
   the parts ship**: in order or stacked.
2. **Write.** Claude writes each part to a file with the date of the plan and
   the number of the part, for example
   `.plans/20261105-order-exports-1-monthly-csv.md`. The original plan becomes an index of the parts.
3. **Check part 1.** The bar-raiser examines part 1. Then Claude opens the
   view of part 1.
4. **Build in order.** Run `/mochi:build` on part 1. A later part waits
   until the team merges the part before it. Before you build that part, the
   bar-raiser examines it again, because the code below it changed.

**Stacked parts.** Select stacked parts when you want a review of part 2 while
part 1 is still in review. A stacked part starts when Claude pushes the part
below it:

- Build makes a branch from the branch of the part below.
- The review examines only the new commits.
- Build gives you `/mochi:pr <branch below>`. The pull request then targets
  the part below, and it tells reviewers to merge that part first.

Merge the parts from the bottom to the top. After each merge, run
`/mochi:pr` on the branch of the next part. This command rebases the branch
onto the default branch and runs the checks. Then it asks for your approval
before it force-pushes. It also restacks a part when the part below it gets
new commits during the review.

## `/mochi:refactor`

Build tidies the code that its change touches. To improve code that no change
touches, start from the area and tell Claude the problem:

```
/mochi:refactor api/billing; pricing changes keep breaking refunds
```

1. **Audit.** The reviewers and the tidy checks examine the full area. They
   compare it with your `CLAUDE.md`, the stack conventions and the principles.
2. **Candidates.** The findings become refactor candidates. Each candidate
   gives these items:
   - Its cost to the team now.
   - The files that it touches.
   - How well tests protect it.
   - Its size.

   Claude puts the bugs that it finds in a separate list, for
   `/mochi:fix-bug`. Each item has a [grade](#grades). **You select the
   candidates.** Claude saves the audit in `.reviews/REF-<date>-<area>.md`:

   ```markdown
   Open: 🔴 1 · 🟠 1 · 🟡 1 · 🔵 0

   ## Bugs, for /mochi:fix-bug
   - 🔴 Critical  api/billing/refund.py:88 — Partial refunds round in the customer's disfavour.

   ## Candidates
   - [ ] R-1 🟠 High · M    Discount rules live in three handlers — each pricing change edits all three. Pinning: partly.
   - [ ] R-2 🟡 Medium · S  invoice.py is 640 lines with two concepts. Pinning: covered.
   ```

3. **Plan.** Claude writes one plan for each independent group of
   candidates. Each plan says "behaviour must not change" and gives the tests
   that pin that behaviour. **You approve each plan.**
4. **Build.** Run `/mochi:build .plans/<date>-<slug>.md` for each plan, one
   plan at a time. Build first writes the tests that pin the behaviour, if
   they are not there yet. It makes sure that they pass on the current code. Then it refactors
   one slice at a time, and the tests must continue to pass.

## `/mochi:fix-bug`

```
/mochi:fix-bug saving a profile with an empty name returns 500 instead of a validation error
```

1. **Clarify.** Claude asks one time for the data that the report does not
   give: the steps, the expected and the actual behaviour, and the location.
2. **Find the cause.** Claude follows the code that really runs, from the
   entry point of the app.
3. **Reproduce.** Claude writes a test that fails because of the bug. If two
   attempts fail, Claude adds temporary log statements and asks you to reproduce the
   bug.
4. **Report.** Claude tells you the cause and the proposed fix. **You
   decide**, unless your request already asked for the fix. If the fix
   changes more than one location or changes what the user sees, Claude
   tells you and recommends `/mochi:build`.
5. **Fix.** Claude makes one minimal change. It commits the change and pushes
   it to a feature branch.

## `/mochi:review`

```
/mochi:review 1234 skip infra/; api/ already reviewed except auth.py
```

This command reviews a pull request, a branch or uncommitted work. Without
arguments, it reviews the current branch and its uncommitted changes.

The command divides the change by stack, for example "Python, api/" and
"React, web/". Then it reviews one area at a time, and it starts with the area
of highest risk. **You select the findings to fix after each area.**

Each area gets these reviewers:

- The generic reviewers and the reviewers of the applicable stack plugin.
- One quick reviewer, in place of the correctness, test and hygiene
  reviewers, for a small area. A small area has less than 80 changed lines,
  and it has no database access, auth check, route or published API. To get
  the three reviewers for a small area, ask for a full review.
- The data reviewer, for an area that touches a database.
- An accessibility reviewer, for an area with markup. This is the reviewer of
  the stack plugin when it has one. If not, it is the generic reviewer.

A stack reviewer can state when it runs. For example, the API
contract reviewer runs only when the area touches the HTTP surface.

Claude examines each Critical and High finding against the code before you
see it.
Claude shows Medium and Minor findings as the reviewers wrote them. It
examines them before it fixes or posts them.

When a reviewer says that a test cannot fail, Claude proves it. This
applies when the test runs without a build or a service. Claude removes the
guard in a copy, runs the test and then restores the file.

When your branch is behind the pull request or its upstream, Claude tells
you. It asks before it pulls.

Each finding has a [grade](#grades). The report shows the most severe findings
first. Claude saves the findings in `.reviews/REV-<date>-<pr number>.md`, so
that a later session can continue the review. Before the pull request exists,
the file uses the branch name in place of the number.

For a pull request, Claude offers to post the open findings as one comment.
**You approve the comment** before Claude posts it. When findings are
skipped or fixed, Claude edits the same comment.

A package can have its own manifest but no `CLAUDE.md`. Then the review tells
you, and it recommends `/mochi:setup-project` first, because the instructions
above the package can be for a different app.

Build does the review step itself. Use `/mochi:review` alone for work that
build did not make, for example a pull request from a team member. To examine
code without a change, use `/mochi:refactor`.

### Grades

Reviews and refactor audits give a grade to each finding. The grade comes
from the consequence of the finding. Claude examines the Critical and High findings
against the code first:

| Grade | Description | In a refactor audit |
|---|---|---|
| 🔴 Critical | A security hole, data loss, or a crash or wrong result on a path that most users take. It blocks the merge. | Bugs only |
| 🟠 High | Wrong behaviour on a narrower path, an important behaviour without a test, or code that gives a wrong idea. It blocks the merge. | Bugs, and candidates that make a bug likely in data, money or access, or that make each change more difficult |
| 🟡 Medium | Real risk or debt that breaks nothing now. | Other candidates |
| 🔵 Minor | Optional improvement. | The "later" list |

The findings file starts with the number of open findings for each grade, for
example `Open: 🔴 0 · 🟠 2 · 🟡 5 · 🔵 3`. A problem copied from current code
gets the grade of its effect in the change, as if the code was new. A `?` at
the end, as in `🟡 Medium?`, marks a finding that the code alone cannot
confirm. An example is a finding that depends on the size of a table.

## `/mochi:pr`

This command writes the body of the pull request from the final diff. The
body has a TL;DR, the reasons, the risk, the review steps, the review
questions and a manual test plan. The command also adds self-review comments
at the lines with risk. Claude writes the body and the comments in STE and UK
English. **You approve the body and the comments.** Then the
command opens the pull request as a draft. It marks the pull request as ready
only when you tell it to.

On the branch of a stacked part, the pull request targets the part below. The
command restacks the branch when the part below changes or merges, as
[stacked parts](#mochisplit) describes.

## Branches and commits

- Build and fix-bug commit through one internal step. This step pulls first
  and adds files by explicit path. Then it runs the verification commands. It
  writes a Conventional Commits message that gives the reason for the change,
  in STE and UK English. A commit guideline in your `CLAUDE.md` wins.
- On the default branch, the first commit makes a feature branch with the
  name `<type>/<slug>`, for example `feat/csv-export`. For a stacked part, the
  first commit makes the branch from the part below.
- Claude never pushes to the default branch. It force-pushes only the branch
  of a stacked part, and only when you agree to a restack.
- To commit changes that you made yourself, ask Claude to commit them. The
  same rules apply. Claude pushes only when you ask.

## A frontend and a backend in one repository

In this example, a repository has a React + Fluent UI frontend in `apps/web`
and a FastAPI backend in `services/api`. Its root `CLAUDE.md` describes a
different app.

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

During setup, confirm the parts of the root `CLAUDE.md` that do not apply to
each package.

- In `apps/web`, the `mochi-react` hooks lint each edit and run `typecheck`
  and `test`. The React reviewers are part of each review.
- In `services/api`, the `mochi-python` hooks run Ruff on each edit. They also
  run the type checker, import-linter and pytest from the virtualenv of the
  package. The Python conventions reviewer is part of each review. The API
  contract reviewer is also part of the review when the change touches the
  API.

The hooks of each plugin do not touch the other package.
