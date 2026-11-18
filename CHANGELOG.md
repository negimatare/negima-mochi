# Changelog

Each release of the `mochi`, `mochi-react`, and `mochi-python` plugins. To get
a new release where the kit is installed, run
`claude plugin marketplace update negima-mochi`, then
`claude plugin update <plugin>@negima-mochi` for each installed plugin, and
restart Claude Code.

## Unreleased

Reviews and plans cost less.

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
- The bar-raiser's re-check continues the same agent instead of starting a
  new one that reads the code again.
- Every agent makes the reads it can name up front in its first turn, in
  parallel.
- A stack plugin's reviewer can name a condition for running, and reviews and
  audits skip it when the condition does not hold.

### mochi-python

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
