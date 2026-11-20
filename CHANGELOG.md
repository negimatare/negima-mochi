# Changelog

Each release of the `mochi`, `mochi-react`, and `mochi-python` plugins. To get
a new release where the kit is installed, run
`claude plugin marketplace update negima-mochi`, then
`claude plugin update <plugin>@negima-mochi` for each installed plugin, and
restart Claude Code.

## 1.3.0 — unreleased

The banner shows which mochi release runs and which plugins have an update.
The test suite of the kit is smaller, and a release check costs two fifths
of the 1.2.0 check, in half the time.

### mochi

- **Versions in the banner.** The banner shows the version of each installed
  mochi plugin, on one line. An orange `↑` marks a plugin that is older than
  the latest GitHub release, and the end of the line shows that release, for
  example `↑ 1.3.0 latest`. The banner gets the latest release from the
  GitHub API, one time in 12 hours at most. `MOCHI_UPDATE_CHECK=0` stops
  this request.

### Work on the kit

These changes are for contributors. They do not change the installed
plugins.

#### Evals

- **A smaller suite.** 11 `mochi` cases are retired, so the suite has 66
  cases, not 77. They passed without the plugin, had low stakes, or tested a
  branch of a rule that another case covers. Each case that guards a push, a
  force-push, data or the branch stays, and each skill keeps three cases.
- **A core tier.** 36 cases have the `core` tag: the main path of each
  workflow and each high-stakes guard. Before each release, only these run,
  on Opus and Sonnet, with no baseline. All cases still run before a major
  version or a change of the default model.
- **A stricter rule for a new case.** A new case is only for a regression
  that is likely and costly. Any other rule gets a grader in an existing
  case. In a review, a missing case for a narrow guard is Medium at most.
- **One shared grader.** Each suite has one `evals/_shared/git-worked.md`.
  The 107 cases link to it, and do not keep a copy.
- **A release history.** `evals/history.tsv` keeps the results of each
  release, from 1.1.0. `scripts/eval-history.mjs --demote` lists the core
  cases that passed every run in three releases.

#### Script tests

- **Tests with no model call.** `tests/` runs the banner, the dependencies
  hook and the history script as child processes. The `Hook tests` workflow
  runs them on each push.

#### Releases

- **A release from a tag.** A pushed `v*` tag on `main` runs the `Release`
  workflow. It checks the manifests, the changelog section and the tests,
  and publishes the release with the notes of that section.

### Tested

The pre-release eval run of `mochi`, one run of each case on each model:

| Release | Cases | Model runs | Cost | Run time |
|---|---|---|---|---|
| 1.2.0: all cases, Opus with baseline, Sonnet | 77 | 249 | $49.74 | 68 min |
| 1.3.0: core cases, Opus, Sonnet | 36 | 76 | $19.42 | 35 min |

The run time is the sum of the eval runs, at four cases at a time. Both
rows include the reruns of the failed cases. The 1.2.0 row also includes
the second part of the runs, after the old caps stopped them. The first
pass of 1.3.0 was 72 runs, $17.95 and 26 min.

On Opus 5.5, the 36 core cases pass. Two of them passed on the rerun, as
their `git-worked` grader failed the first time. On Sonnet 5.5, 34 cases
pass. `review-asks-before-pulling-a-branch` and
`review-sends-a-small-change-to-the-quick-reviewer` failed on both runs. No
skill or agent changed in 1.3.0.

## 1.2.0 — 2026-11-20

Mochi writes shorter and plainer text, and handles stacked pull requests and
CI checks better.

### Update

- Run `/mochi:setup-project` again to add the new "Before a push to an open
  PR" list to an existing `CLAUDE.md`.
- Optional: install the [`gh stack`](https://github.com/github/gh-stack)
  extension with `gh extension install github/gh-stack`.

### mochi

#### Writing

- **Simplified Technical English.** Mochi writes its own text in
  [ASD-STE100](https://www.asd-ste100.org/), in a UK English tone: plans,
  audits, findings files, pull request text, commit messages and a new
  `CLAUDE.md`. Identifiers, file paths and quoted text stay exact.
- **Your text keeps its language.** A file that mochi does not own keeps its
  language, and a rule in your `CLAUDE.md` wins. A reviewer does not report
  US spelling, STE grammar or sentence length in your code or text.
- **Shorter replies.** A reply answers what you asked and stops. A caveat
  comes one time, not in each later summary.
- **Comments are the last resort.** Tidy deletes a comment that restates the
  code, a one-time setup note, a plan-step name and a "do not change"
  warning. When a comment says something that the code does not, tidy puts
  it in a name or a constant. A one-line why, a licence header and a lint
  directive stay. The hygiene reviewer and the `/mochi:refactor` audit report
  these comments too.

#### Pull requests

- **A two-section body.** `/mochi:pr` writes a TL;DR and a Why. The Why names
  each place where the code is different from the plan, and why.
- **Self-review comments that you select.** `/mochi:pr` lists the candidates
  in one line each, and writes only the ones that you select.
- **An open High or Critical finding comes first.** Claude offers to fix it.
  If you decline, the Why names the gap.
- **Screenshots for a UI change.** When the diff changes markup or styles,
  `/mochi:pr` asks for before and after screenshots and attaches them with
  `gh pr create --attach`. It tells you to check the images for customer
  data.
- **CI checks before a push.** `/mochi:setup-project` writes a "Before a push
  to an open PR" list from the `pull_request` CI jobs that the verification
  commands do not run. `/mochi:pr` and the commit step run it before a push
  to an open pull request. A failure stops the push.

#### Stacked pull requests

- **`gh stack` support.** With the extension and a `gh` login, `/mochi:pr`
  puts each stacked pull request in a local stack and links the stack on
  GitHub. A restack rebases all the parts, asks one time, and pushes them.
  Without `gh stack`, it restacks with git, as before.
- **The fix goes on the part that has the bug.** When `/mochi:review` finds a
  bug in code of an unmerged part below, it fixes the bug on that part's
  branch and rebases the part above. It pushes nothing: `/mochi:pr` pushes the
  two branches. With uncommitted changes, or in the review of a build, the
  fix stays on the current part, and the reply says why.
- **Other people's commits stay.** When another person pushed commits to the
  branch, `/mochi:pr` shows them and restacks nothing.

#### Reviews

- **The right base.** `/mochi:review` compares a pull request, and a branch
  with an open pull request, with the base of that pull request.
- **Another person's pull request.** The fix round changes no file of it.
- **Rare-path tests are Minor.** A missing test for a race, a restart or an
  input that production cannot send is Minor at most, with no test needed.
- **Skipped stays skipped.** A finding that you skipped stays skipped in a
  new review of the area, unless the new finding has a higher grade.
- **One caveat.** The note that the Medium and Minor findings are not yet
  examined comes in the first report of the session only.

#### Plans and builds

- **Two deployables.** When a change edits two deployables, the plan asks if
  they deploy together. When they do, the plan has no compatibility step.
- **Ask before infrastructure.** Mochi asks before it runs a migration or
  changes local infrastructure.

## 1.1.0 — 2026-11-18

Reviews, plans, and builds cost less.

### mochi

- A small area, under 80 changed lines and reaching no database, auth
  check, route, or published API, gets one quick reviewer,
  `001-shamed-instrument`, in place of the correctness, test, and hygiene
  reviewers. Ask for a full review to get all three.
- In `/mochi:build`, the hygiene reviewer skips the dead-code sweep and the
  naming checks, which the tidy step already covered on every slice. It
  still checks comments, docs, rename leftovers, and scaffolding.
- Only blocking findings are checked against the code before the report.
  Medium and Minor findings are checked when you pick them to fix or before
  they go into a pull request comment.
- `/mochi:build` offers a fresh session at its two long stops: when you
  approve the plan, and before reviewing more than one slice. It gives the
  command to run after `/clear`, so the next step starts without the
  previous one in its context.
- The bar-raiser's re-check continues the same agent instead of starting a
  new one that reads the code again.
- The reviewers and the bar-raiser make the reads they can name up front in
  their first turn, in parallel.
- A stack plugin's reviewer can name a condition for running, and reviews and
  audits skip it when the condition does not hold.

### mochi-react

- The conventions and accessibility reviewers make the reads they can name
  up front in their first turn, in parallel.

### mochi-python

- The conventions and API contract reviewers make the reads they can name
  up front in their first turn, in parallel.
- The API contract reviewer runs only when a change touches the HTTP
  surface: endpoints, schemas, error handling, auth, middleware, code a route
  calls that raises a new exception, or the committed spec.

## 1.0.0 — 2026-11-16

The first release.

### mochi

- Seven commands: `/mochi:setup-project`, `/mochi:build`, `/mochi:split`,
  `/mochi:refactor`, `/mochi:fix-bug`, `/mochi:review`, and `/mochi:pr`. Each
  stops for you at the decisions that are yours: the plan, the split, the
  review findings, the pull request body.
- Plans go to `.plans/` with acceptance scenarios, verified facts, and the
  slices to build. A bar-raiser agent challenges each plan before any code
  exists, and the plan opens as an HTML view with a data-flow diagram and,
  for frontend changes, each screen before and after.
- `/mochi:split` cuts a plan that is too big into parts, one pull request
  each, built in order or stacked; `/mochi:pr` restacks a stacked part.
- Building is test first, one commit per slice on a feature branch, tidied
  and verified with the project's own typecheck, lint, and tests. Nothing
  goes to the default branch.
- Reviewers go through a branch one area at a time: correctness, tests,
  hygiene, data, and the accessibility of any markup. Each finding is graded
  🔴 Critical, 🟠 High, 🟡 Medium, or 🔵 Minor, and you pick which to fix.
- Review, refactor, and plan files are named by the day they are first
  written: `.reviews/REV-<date>-<pr number>.md`,
  `.reviews/REF-<date>-<area>.md`, and `.plans/<date>-<feature>.md`.
- A dependency policy, and a hook that asks before any install or upgrade.
  Installs from the lockfile pass.
- Every session starts with the working principles in context, and a new one
  opens with a banner from one of the reviewers. `MOCHI_BANNER=0` hides it.

### mochi-react

- Seven conventions for React + Fluent UI v9 + Griffel: architecture,
  components and styling, forms, i18n, performance, state and dependency
  injection, and testing. A hook loads each one when Claude touches a file it
  covers.
- Two reviewers, for conventions and for accessibility, that join the
  `mochi` review and refactor flows.
- Hooks that run ESLint `--fix` on each edited file, and the typecheck and
  tests before Claude ends a turn.

### mochi-python

- Seven conventions for FastAPI services: architecture as vertical slices,
  the domain model, the service layer, API design, OpenAPI, persistence, and
  testing.
- Two reviewers, for conventions and for the API contract: breaking
  changes, errors, pagination, and the committed OpenAPI spec.
- Hooks that run Ruff `--fix` on each edited file, and the type checker
  (pyright or mypy), the import-linter contracts, and pytest before Claude
  ends a turn, all from the project's virtualenv.

### Tested

96 eval cases: 55 in `mochi`, 23 in `mochi-react`, and 18 in `mochi-python`.
On Claude Opus 5.5, 52 of the 55 `mochi` cases pass. The failures are
`dependencies-hook-asks-only-for-changes`, `hygiene-runs-the-project-tool`,
and `review-proves-a-test-that-cannot-fail`.
