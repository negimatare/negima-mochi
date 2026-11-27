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

## 1.4.1 — unreleased

Small fixes after 1.4.0.

### mochi plugin

- **Pull request bodies keep each paragraph on one line.** GitHub shows
  each newline in a body as a line break, so `/mochi:pr` no longer wraps
  a paragraph or a list item.
- **A review diffs against the base on the remote.** Step 4 of
  `/mochi:review` named the local base branch, which can be behind, while
  step 1 named the ref on origin. It now uses that ref in both, and the
  owning-part check of a stacked branch tries both the local and the
  remote base.
- **A runtime check shows the change in the running app.** A project can
  name, in a `## Runtime check` section of its `CLAUDE.md`, a command that
  opens the app on fakes and saves its screens and a log. `/mochi:build`
  runs it after the last slice that changes the UI and looks at the
  changed screens. `/mochi:pr` offers to make the before and after
  screenshots with it, the base from a `git archive` copy, so the checkout
  stays as it is. `/mochi:setup-project` names such a command when the
  project has one.
- **A project can name its integration branch.** One line in the root
  `CLAUDE.md`, ``Integration branch: `develop` ``, makes it the default
  branch of the mochi skills: commit branches off it, pr targets it, and
  review diffs against it. The git hook now also asks before a push to it,
  not only to the branch of `origin/HEAD`. `/mochi:setup-project` asks for
  it when pull requests do not go to the branch of `origin/HEAD`.

- **Autonomous mode, off by default.** With the word `autonomous` in a
  request, or the new plugin option `autonomous`, review, build and split
  take the recommended answer at their reversible stops and report each
  choice: no plan approval when the bar-raiser gave no `must`, a fix of
  each Critical and High finding, the areas in order, a split in order, and
  a fast-forward pull of a branch that is behind. A push, a pull request, a
  comment, a force-push and an install still ask.

### mochi-react plugin

- **The property order rule says where lint enforces it.** The
  components-and-styling skill said `perfectionist/sort-objects` enforces it,
  but the mochi preset does not set that rule: it is enforced only where
  the project sets it.

### For contributors

- **The eval notes match the sandbox.** CONTRIBUTING says why each git
  command in an eval trace prints two harmless lines, and what a `git-worked`
  failure with `Failed to locate 'git'` means. It gives one fixed eval
  folder that you trust one time, and says that `--case` takes one case.
- **Five review cases plant a security hole.** An order read with no owner
  check, a path from the query, SQL from an f-string, a secret in a `VITE_`
  variable and a fetch of a URL from the request, each beside a safe decoy.
  Opus and Sonnet find each hole with and without the kit, so the kit adds
  no security reviewer. The cases, tagged `security`, guard what the kit
  adds: the hole recorded as blocking at its line in the findings file.
- **The release evals cost a third less.** 12 core cases that passed every
  run in the last three releases, and guard no push, data or branch, leave
  the `core` tag. `eval-history.mjs --demote` now lists a case whose graders
  changed since the first of those releases apart, as it keeps `core`.
- **The pr skill names the restack reasons once.** Step 1 gave the meaning
  of each reason of `stack-check.mjs`, which step 6 already acts on.

## 1.4.0 — 2026-11-27

The `main` branch now holds only releases, so an install gets the latest
release and not the work in progress. A tag in the marketplace source pins
one release.

### mochi plugin

- **A guard for git commands.** A push to the default branch, a force push
  without `--force-with-lease`, `git add -A` or `git commit -a`, and
  `--no-verify` now ask you first, with the rule that they break. The words
  of a commit message do not count.
- **A scripted stack check.** `/mochi:pr` finds the reasons to restack, and
  the commits that another person pushed to your branch, with a script
  instead of reading git itself. Without `gh`, it asks you whether the base
  is merged. After `gh stack push`, a script names each branch that did not
  move, and the git path pushes with `--force-if-includes`.
- **`/mochi:setup-project` adds the lint preset of each stack plugin.** It
  copies the ESLint preset and spreads it in your config, and proves its
  layer rule with a planted import, which it removes. When lint misses the
  import, it removes the preset again and stops. It merges the Ruff
  preset into the file that Ruff reads, and keeps your own `select`. You
  agree before each edit.
- **`/mochi:review` finds the change with a script.** The pull request,
  its base, its author, and how far the branch is behind its upstream come
  from one script instead of separate git and gh calls. A detached HEAD and
  a pull request from a fork now resolve too. The review asks before it
  switches to a branch that is not checked out.
- **The test proof restores your file.** When a review proves that a test
  cannot fail, a script puts the changed file in place, runs the tests with
  a time limit, and puts your file back, also when the run hangs or is
  stopped.
- **A small change in a library gets the quick reviewer.** A package counts
  as published only when its manifest or its release workflow says so, so
  the exports of a library with no manifest no longer send a small change
  to the full panel.
- **The review runs your typecheck and lint first.** It runs the typecheck
  and lint lines of the package's `## Verification` block before the
  reviewers, and gives them the output, so they leave what the tools
  report. A failure on a changed line is a High finding. On another
  person's pull request, it asks once first, as their lint config runs as
  code.

### mochi-react plugin

- **The stop check reports a check that hangs.** The checks share one
  540 s deadline, and a check that runs past it is reported once, so that
  the hook timeout does not drop the result. A deleted file, a file moved
  out of its package, and a change to `package.json` now start the checks
  of that package.
- **A broken ESLint config is no longer reported as lint problems.**
  Claude gets a note with the cause that ESLint gave. `eslint.config.mts`
  and `.cts` are found.
- **The stop check runs your `CLAUDE.md` Verification block.** When the
  nearest `CLAUDE.md`, in the package or a folder above it, has one, its
  commands run in place of `typecheck` and `test`. To keep the scripts,
  set `MOCHI_VERIFY_FROM_CLAUDE_MD=0`.
- **An ESLint preset.** `presets/eslint-mochi.mjs` holds the layers of the
  architecture skill, with `eslint-plugin-boundaries` 7, the `react-hooks`
  `recommended` rules, the size warnings and the Griffel shorthand rule.

### mochi-python plugin

- **The stop check reports a check that hangs**, as in mochi-react. A
  deleted or moved file, and a change to `pyproject.toml`, `mypy.ini`,
  `pyrightconfig.json` or `.importlinter`, now start the checks. mypy gets
  only the changed files that still exist, or its own `files`.
- **A broken Ruff config is no longer reported as lint problems.** Claude
  gets a note with the cause that Ruff gave.
- **The stop check runs your `CLAUDE.md` Verification block**, as in
  mochi-react, in place of the type checker, import-linter and pytest. A
  `uv run` in the block does not sync or install first.
- **A Ruff preset.** `presets/ruff-lint.toml` bans the direct time and
  environment calls outside `bootstrap.py` (`TID251`), and turns on `ASYNC`
  and `S113`.

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
- **Checks for the kit's own rules.** `node scripts/kit-rules.mjs` checks the
  rules of `CLAUDE.md` and CONTRIBUTING that have an exact answer, such as
  the reviewer models, the plugin versions and the eval case layout. The
  `Hook tests` workflow runs it, and both branches now require that check.
- **Evals grade what a run did.** A stub plugin writes the commits, the
  pushes and the files at the end of a run, and the commit, build, fix-bug,
  pr and review cases grade that end state instead of a reply or a command
  line. CONTRIBUTING's Evals section gives the rules for a new grader.
- **The eval history names the graders that failed.** Each row of
  `history.tsv` lists them, so a flaky grader is easy to see.
- **The lint presets are proved with the real linters.** The
  `Lint presets` workflow installs pinned Ruff, ESLint and the plugins of
  the React preset. kit-rules checks that a skill names each preset.

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
