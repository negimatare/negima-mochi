# Changelog

Each release of the `mochi`, `mochi-react`, and `mochi-python` plugins. To get
a new release where the kit is installed, run
`claude plugin marketplace update negima-mochi`, then
`claude plugin update <plugin>@negima-mochi` for each installed plugin, and
restart Claude Code. An install pinned to a tag moves with the steps in the
README Install section.

Each release has a section for each plugin that changed. **For contributors**
lists the work on the kit itself, which does not change the installed
plugins.

## 1.3.2 — unreleased

The `main` branch now holds only releases, so an install gets the latest
release and not the work in progress. A tag in the marketplace source pins
one release.

### For contributors

- **A new integration branch.** Pull requests target `mochitsuki`. Only a
  release branch or a hotfix targets `main`. A release copies the files of
  `mochitsuki` to `main`, and both branches take only squash merges.
  CONTRIBUTING's Branches section gives the steps.
- **Signed release tags.** The release steps sign each tag with
  `git tag -s`, and check the signature before the push.
- **A `CLAUDE.md` for the kit.** It gives the verification commands, the
  integration branch, and the rules for the changelog, the pull request body
  and the README.

## 1.3.1 — 2026-11-20

The pull request body follows a template. The banner shows all the mochi
plugins that you installed from a local marketplace.

### mochi plugin

- **A template for the pull request body.** `/mochi:pr` fills
  `skills/pr/assets/pr-body.md`: a TL;DR, a Why, a Screenshots table when
  you give images, and a footer that names Negima Mochi and Claude Code. A
  stacked pull request has no `Stacked on` line above the TL;DR, as GitHub
  shows its base branch.
- **Fix: the banner with a local marketplace.** When you add the kit as a
  marketplace from a folder, the banner shows the versions of the
  `mochi-react` and `mochi-python` plugins that you installed too, not only
  `mochi`.

## 1.3.0 — 2026-11-20

The banner shows the version of each mochi plugin and tells you when an
update is out. Release checks of the kit cost less and take less time.

### mochi plugin

- **Versions in the banner.** The banner shows the version of each installed
  mochi plugin. A bold orange `↑` marks a plugin that is older than the
  latest release, and the line ends with that release, for example
  `↑ 1.x.0 latest`. The banner checks GitHub one time in 12 hours at most.
  To stop the check, set `MOCHI_UPDATE_CHECK=0`.

### For contributors

- **Faster release checks.** Before each release, only the 36 core cases
  run: the main path of each workflow and each guard of a push, a
  force-push, data or the branch. All 66 cases run before a major version.

  | Release check | Cases | Cost | Time |
  |---|---|---|---|
  | 1.2.0 | 77 | $49.74 | 68 min |
  | 1.3.0 | 36 | $19.42 | 35 min |

- **Releases from a tag.** A version tag on `main` checks the release and
  publishes it.

## 1.2.0 — 2026-11-20

Mochi writes shorter and plainer text, and handles stacked pull requests and
CI checks better.

### Update

- **Run setup again.** Run `/mochi:setup-project` again to add the new
  "Before a push to an open PR" list to an existing `CLAUDE.md`.
- **Optional: `gh stack`.** Install the
  [`gh stack`](https://github.com/github/gh-stack) extension with
  `gh extension install github/gh-stack`.

### mochi plugin

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

### mochi plugin

- **One quick reviewer for a small area.** An area under 80 changed lines
  that reaches no database, auth check, route, or published API gets one
  quick reviewer, `001-shamed-instrument`, in place of the correctness,
  test, and hygiene reviewers. Ask for a full review to get all three.
- **A shorter hygiene review in a build.** In `/mochi:build`, the hygiene
  reviewer skips the dead-code sweep and the naming checks, which the tidy
  step already covered on every slice. It still checks comments, docs,
  rename leftovers, and scaffolding.
- **Only blocking findings are checked first.** Before the report, only
  blocking findings are checked against the code. Medium and Minor findings
  are checked when you pick them to fix, or before they go into a pull
  request comment.
- **A fresh session at the long stops.** `/mochi:build` offers a fresh
  session when you approve the plan, and before it reviews more than one
  slice. It gives the command to run after `/clear`, so the next step
  starts without the previous one in its context.
- **The bar-raiser continues.** Its re-check continues the same agent, and
  does not start a new one that reads the code again.
- **Reads in parallel.** The reviewers and the bar-raiser make the reads
  that they can name at the start in their first turn, in parallel.
- **Conditions for stack reviewers.** The reviewer of a stack plugin can
  name a condition for running. Reviews and audits skip it when the
  condition does not hold.

### mochi-react plugin

- **Reads in parallel.** The conventions and accessibility reviewers make the
  reads that they can name at the start in their first turn, in parallel.

### mochi-python plugin

- **Reads in parallel.** The conventions and API contract reviewers make the
  reads that they can name at the start in their first turn, in parallel.
- **The API contract reviewer runs only for the HTTP surface.** It runs when
  a change touches endpoints, schemas, error handling, auth, middleware,
  code that a route calls and that raises a new exception, or the committed
  spec.

## 1.0.0 — 2026-11-16

The first release.

### mochi plugin

- **Seven commands.** `/mochi:setup-project`, `/mochi:build`,
  `/mochi:split`, `/mochi:refactor`, `/mochi:fix-bug`, `/mochi:review`, and
  `/mochi:pr`. Each stops for you at the decisions that are yours: the plan,
  the split, the review findings, and the pull request body.
- **Plans.** Plans go to `.plans/` with acceptance scenarios, verified facts,
  and the slices to build. A bar-raiser agent challenges each plan before
  any code exists. The plan opens as an HTML view with a data-flow diagram
  and, for frontend changes, each screen before and after.
- **Splits.** `/mochi:split` cuts a plan that is too big into parts, one
  pull request each, built in order or stacked. `/mochi:pr` restacks a
  stacked part.
- **Builds.** Building is test first, with one commit for each slice on a
  feature branch. Each slice is tidied and verified with the typecheck,
  lint, and tests of the project. Nothing goes to the default branch.
- **Reviews.** Reviewers go through a branch one area at a time:
  correctness, tests, hygiene, data, and the accessibility of any markup.
  Each finding is graded 🔴 Critical, 🟠 High, 🟡 Medium, or 🔵 Minor, and
  you pick which to fix.
- **Dated files.** Review, refactor, and plan files are named by the day
  they are first written: `.reviews/REV-<date>-<pr number>.md`,
  `.reviews/REF-<date>-<area>.md`, and `.plans/<date>-<feature>.md`.
- **Dependencies.** A dependency policy, and a hook that asks before any
  install or upgrade. Installs from the lockfile pass.
- **Principles and banner.** Every session starts with the working
  principles in context, and a new one opens with a banner from one of the
  reviewers. `MOCHI_BANNER=0` hides it.

### mochi-react plugin

- **Seven conventions** for React + Fluent UI v9 + Griffel: architecture,
  components and styling, forms, i18n, performance, state and dependency
  injection, and testing. A hook loads each one when Claude touches a file
  that it covers.
- **Two reviewers,** for conventions and for accessibility. They join the
  review and refactor flows of the mochi plugin.
- **Hooks** that run ESLint `--fix` on each edited file, and the typecheck
  and tests before Claude ends a turn.

### mochi-python plugin

- **Seven conventions** for FastAPI services: architecture as vertical
  slices, the domain model, the service layer, API design, OpenAPI,
  persistence, and testing.
- **Two reviewers,** for conventions and for the API contract: breaking
  changes, errors, pagination, and the committed OpenAPI spec.
- **Hooks** that run Ruff `--fix` on each edited file, and the type checker
  (pyright or mypy), the import-linter contracts, and pytest before Claude
  ends a turn, all from the virtualenv of the project.

### For contributors

- **Eval suites.** 96 eval cases: 55 for the mochi plugin, 23 for
  mochi-react, and 18 for mochi-python.
