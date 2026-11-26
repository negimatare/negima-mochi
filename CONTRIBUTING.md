# Work on the kit

## Run the kit from a checkout

To load the plugins without an install, run:

```bash
claude --plugin-dir ./plugins/mochi --plugin-dir ./plugins/mochi-react --plugin-dir ./plugins/mochi-python
```

After you change an installed copy, run
`claude plugin marketplace update negima-mochi`.

After you change a manifest, a frontmatter or a hook, run
`claude plugin validate ./plugins/mochi`. Do the same for each stack plugin.

## Layout

The kit uses the Claude Code plugin layout and the
[Agent Skills specification](https://agentskills.io/specification).

- **Workflows are skills, not commands.** Claude Code merged commands into
  skills, and it recommends `skills/` for new plugins.
  - A workflow that only the user starts sets
    `disable-model-invocation: true`.
  - The steps that the workflows share (`plan`, `tidy`, `commit`) and the
    conventions of a stack plugin set `user-invocable: false`. This keeps them
    out of the `/` menu.
- **Reviewers are agents** in `agents/`. An agent uses
  `${CLAUDE_PLUGIN_ROOT}` paths for the plugin files that it reads. The quick
  reviewer applies sections of the correctness, test and hygiene reviewers. It
  finds these sections by their headings: "You own", "Severity", "After tidy",
  "Others own" and "Output". If you rename one of these headings, also edit
  `agents/quick-reviewer.md`.
- **The colour of an agent shows its role.** A role has the same colour in all
  plugins, so two reviewers of one step never have the same colour:

  | Colour | Role |
  |---|---|
  | Purple | Plan |
  | Red | Correctness |
  | Green | Tests |
  | Yellow | Hygiene |
  | Orange | Data |
  | Cyan | Accessibility |
  | Blue | Stack conventions |
  | Pink | API contract |

  Claude Code has only these eight colours. A new role uses the colour of the
  nearest role.
- **Text for all sessions and agents** is at the plugin root, for example
  `principles.md`. A `SessionStart` hook prints it. Agents read it from its
  `${CLAUDE_PLUGIN_ROOT}` path.
- **Hook scripts** are in the `scripts/` folder of the plugin, next to
  `hooks/`.
- **A skill is one `SKILL.md` file until it needs more.** Add the folders of
  the specification only when a file needs a location:
  - `assets/` for templates.
  - `references/` for detail that you move out of a `SKILL.md` longer than
    approximately 200 lines. Anthropic recommends less than 500 lines.
  - `scripts/` for a deterministic step that the skill runs through
    `${CLAUDE_SKILL_DIR}`.

  Link each file from `SKILL.md`, one level deep. To refer to a file in a
  different skill, use its `${CLAUDE_PLUGIN_ROOT}` path. Do not use `../`.

### When a convention loads

The hook of a stack plugin loads a convention in two conditions:

- A session starts in a package of that stack.
- Claude reads, writes or edits a file that matches the `paths:` patterns of
  the convention.

It loads each convention one time in each session, and again after
compaction.

A convention for one library also gives the packages that it needs. Put them
in double quotes, with a space between them. The convention then loads only
in packages that depend on all of them:

```yaml
metadata:
  mochi-requires: "react-hook-form zod"
```

### The skill map

`docs/skill-map.svg` and `docs/skill-map.html` show which skills, agents and
conventions each command runs.

`scripts/skill-map.mjs` finds the links in the files of the plugins:

- A skill that runs or follows a different skill.
- A `/mochi:` command that a skill runs.
- A `SKILL.md` path that a skill reads.
- An agent that a skill starts.
- The target of each hook.

`docs/skill-map.notes.json` contains the data that the files cannot give: the
subtitle of each box, the condition or note of each link and the sequence of
the boxes.

After you change which skill runs which box, run
`node scripts/skill-map.mjs`. The script draws the two files again. It stops
and shows a list when the notes and the plugins do not agree:

- A link that has no note.
- A note for a link that no file has.
- A box that has no subtitle.

In this repository, Claude does this step for you. The hook in
`.claude/settings.json` draws the map again after Claude writes or edits a
file in `plugins/`. On each push, the GitHub workflow `Skill map` runs
`--check`. This check fails when the committed map is out of date.

## Hook tests

The tests in `tests/` run a hook script, or a script in `scripts/`, as a
child process, with no model call and no network. Run them with `node --test tests/*.test.mjs`. The
GitHub workflow `Hook tests` runs them on each push. A test sets the
`CLAUDE_*` folders to temporary folders when its hook reads them, so that
it does not read your own `~/.claude`.

Two of these tests check the kit itself:

- **`kit-rules.test.mjs`** runs `scripts/kit-rules.mjs`, which checks the
  rules of `CLAUDE.md` and of this file that have an exact answer: the model
  of the inherit reviewers, the manifests and their versions, the
  frontmatter of skills and agents, the agent ids in skill text and in
  graders, the layout and tags of the eval cases, versions in docs examples,
  and the shape of `CHANGELOG.md`. Run `node scripts/kit-rules.mjs` to see
  each problem with its file.
- **`graders.test.mjs`** builds the fixture of an eval case, plays a run
  by script, and applies the graders of the case as `claude plugin eval`
  does. It shows that a grader passes a good run and fails a bad one, with
  no model call.

## Evals

Each plugin has an eval suite in its `evals/` folder. Run it with
`claude plugin eval`. Each case has these steps:

1. Its `fixture.sh` builds a small repository.
2. The case sends one request.
3. The graders examine the reply, the files that Claude wrote and the tools
   that Claude used.

The workflow cases send the text that a user types. The reviewer cases call
the reviewer directly, to test the agent alone.

When you change the behaviour of a skill or an agent, add or update a
grader that fails on the old version. It is how a kit change gets a test.
Grade what the run did, not what it said: the commits, the pushes and the
files, from the observer (see Shared fixtures), before a phrase in the reply
or a command line in the trace. A trace also holds the text of each skill
that the run read, so a phrase from a skill always matches there.

Each grader of the observer's files needs a run that it fails in
`tests/graders.test.mjs`, and the test fails without one. For other
graders, no check enforces the rule. Each new case makes all later changes
slower and more expensive, so:

- Add a new case only when a regression is likely and costly: a push, a
  force-push, a loss of data, or work on the wrong branch.
- For any other rule, add a grader to an existing case that already gets to
  that step of the workflow.
- In a review of a kit change, a missing case for a narrow guard (a rule for
  one rare input or state) is `imo` (Medium) at most, not `must`. A guard
  of a push, a force-push, data or the branch is the exception.

Each run is a real model call. The cost goes to your API or cloud account, or
counts against your plan. Pin the two models, so that a model update does not
look like a regression:

```bash
M=claude-opus-5-5     # on Bedrock: global.anthropic.claude-opus-5-5
J=claude-sonnet-5-5   # judge for llm graders; on Bedrock: global.anthropic.claude-sonnet-5-5
eval_kit() {  # eval_kit <plugin dir> [claude plugin eval options]
  claude plugin eval "$1" --model "$M" --judge-model "$J" \
    --scaffold --allow-tools Bash Write Edit --no-publish "${@:2}"
}

# After you change a skill or an agent: only its new and changed cases, one
# time on Sonnet, no baseline. $0.10 to $0.85 for each case on Opus, less on
# Sonnet; build and review cases cost the most.
M=claude-sonnet-5-5 eval_kit ./plugins/mochi --case commit-splits-unrelated-changes --runs 1 --ablation none --max-cost-usd 5

# Before each release: the core cases, one time on each model, no baseline.
# Approximately $12 on Opus and $6 on Sonnet for mochi.
eval_kit ./plugins/mochi --tag core --runs 1 --ablation none --max-cost-usd 18 -j 4
M=claude-sonnet-5-5 eval_kit ./plugins/mochi --tag core --runs 1 --ablation none --max-cost-usd 9 -j 4

# Before a major version, or when the default model changes: all cases one
# time on each model, with the no-plugin baseline on Opus. Approximately $31
# on Opus and $10 on Sonnet for mochi, and one hour.
eval_kit ./plugins/mochi --runs 1 --max-cost-usd 40 -j 4
M=claude-sonnet-5-5 eval_kit ./plugins/mochi --runs 1 --ablation none --max-cost-usd 15 -j 4
```

The cost figures come from the 1.2.0 runs. A run that stops at its cap
reports only part of the suite.

Add `--json` to each release run, with a new file name for each run, a
rerun too, for example
`--json ./plugins/mochi/evals/results/release-1.x.y/opus-1.json`. The tool
writes a relative path below the current folder, not below the plugin. The
results folder is git-ignored, so then add all the runs of the release to
the history in git:

```bash
node scripts/eval-history.mjs ./plugins/mochi 1.x.y ./plugins/mochi/evals/results/release-1.x.y/*.json
node scripts/eval-history.mjs ./plugins/mochi --demote
```

`evals/history.tsv` has one row for each case, release, model and arm, with
the passes, the runs, and the graders that failed. The first command replaces the rows of that
release, so give it every JSON of the release: then a rerun that passes
does not hide the failure before it. A run that the cost cap cut off before
its paid graders is not counted. `--demote` lists the core cases that
passed every run on Opus and Sonnet in the last three releases. Remove the
`core` tag from these cases.

The skill guidance from Anthropic asks for a minimum of three cases for each
skill. It also asks you to test each case on all models that the kit
supports. At this time, these models are Opus and Sonnet.

Run a new case one time with the baseline. If the no-plugin run also passes a
case, the case still finds regressions, but it does not show what the kit
adds. Its description must say this.

### Tags

A tag gives the subject of a case:

- **`mochi`**: `plan`, `build`, `split`, `fix-bug`, `commit`, `pr`, `setup`,
  `dependencies`, `review`, `refactor`, `tidy`, `correctness`, `tests`,
  `hygiene`, `data` and `a11y`.
- **`mochi-react`**: one tag for each convention skill (`architecture`,
  `components`, `forms`, `i18n`, `performance`, `state`, `testing`). It also
  has `conventions` and `a11y` for its two reviewers.
- **`mochi-python`**: one tag for each convention skill (`architecture`,
  `domain`, `service-layer`, `api-design`, `openapi`, `persistence`,
  `testing`). It also has `conventions` and `api-contract` for its two
  reviewers.

The `smoke` tag marks the case with the lowest cost in `mochi` and in
`mochi-python`.

The `core` tag marks the `mochi` cases that run before each release:
the main path of each workflow, and each case that guards a push, a
force-push, data or the branch. A new case that guards one of these gets
the `core` tag too. Repeated `--tag` options select the cases that have any
of the tags.

### Shared fixtures

- **The `git-worked` grader** is one file in each suite,
  `evals/_shared/git-worked.md`. Each case has a relative symlink to it. In
  a new case, run
  `ln -s ../../_shared/git-worked.md graders/git-worked.md`. On Windows,
  clone with `core.symlinks=true`, or the links are text files and the
  grader does not load.
- **`mochi-react`** cases use `evals/_shared/shop-web.sh`. This script builds
  an orders app in React + Fluent UI with the layout of the `architecture` skill.
  The app has no `node_modules`, so nothing builds or runs. The graders read
  the files that Claude writes and the findings of the reviewers.
- **`mochi-python`** cases use `evals/_shared/shipping-api.sh`. This script
  builds a FastAPI shipping service with the layout of its `architecture`
  skill. The service has a committed `openapi.json` and a fake unit of work.
  It has no `.venv`, so nothing runs during a case. Outside a case, the
  service passes its typecheck, lint, import contracts and tests. Keep it in
  this condition when you change it. Also generate the embedded
  `openapi.json` again from the app.
- **Cases that commit or push** use `evals/_shared/shop-lib.sh`. Eval runs
  disable git hooks, so this script gives these signals to the graders:
  - `npm test` writes a line to `.eval/test-runs.log` for each run, and the
    tree that it tested to `.eval/test-trees.log`.
  - Packed refs make a commit to `main` create a `refs/heads/main` file,
    which `file_exists` can see. A grader with `exists: false` on a ref is
    an end state that also works without the observer.
  - `finish_shop` writes the commit of each ref to `.eval/fixture-refs` and
    `.eval/fixture-origin-refs`, for the observer.
- **The observer**, `evals/_shared/observer/`, is a stub plugin with one
  Stop hook. A `mochi` case loads it with
  `plugins: ["../..", "../_shared/observer"]`. At the end of the run it
  writes two files, with git only. It runs no code that the run wrote.
  - `.eval/end-state.txt` has one fact on each line: each new commit as
    `local <branch> <subject>` and `origin <branch> <subject>`, each file of
    a new commit as `file <branch> <subject> <path>`, each uncommitted
    change as `status <line>`, and `tested yes` or `tested no` for a final
    tree that a passing `npm test` saw. A new commit is one that no ref of
    the fixture reaches.
  - `.eval/working-files.txt` has each file of `.plans/` and `.reviews/`,
    after a line `=== <path>`, for a file whose name the run chooses.

  Read them with `target: {source: file, path: .eval/end-state.txt}` and
  `flags: m`. The baseline arm loads no plugin, so give each such grader
  `arm: with-only`. The stack plugins cannot load it: a case loads only
  plugins inside its own plugin.
- **Most review and `pr` cases for a stack** use
  `evals/_shared/order-exports-stack.sh`. This script builds the
  `shop-lib.sh` repository with two stacked branches. Part 2 calls a
  function of part 1 that has a bug.
- **The `pr` and `commit` cases for the "Before a push to an open PR"
  list** use `evals/_shared/api-docs-check.sh`. This script builds the
  `shop-lib.sh` repository with a local branch, and a check in that list
  that fails on the branch.
- **The `pr` cases for a UI change** use `evals/_shared/cart-summary.sh`.
  This script adds a pushed branch to the `shop-lib.sh` repository. The branch
  changes the markup of a component.

### Plugins in a case

A case loads all the plugins in its `plugins:` frontmatter, and no other
plugins. These plugins
replace the plugin under test, and they must be inside that plugin. A `mochi`
case that needs a stack plugin keeps a stub in its own subfolder. It lists
the two plugins in its `plugins:` frontmatter. For an example, see
`setup-adds-lint-rules-without-comments`:
`plugins: ["../..", "./size-stack"]`.

Eval runs have no network and no `gh` login, so cases cannot install
packages or open pull requests. The `pr` and `dependencies` cases test the
steps before these calls, and the behaviour of the kit when the calls fail.

### Options and limits

- `--scaffold` runs each `fixture.sh`, and the `evals/_shared/` scripts that
  it uses, with your permissions and outside the sandbox. Use this option only
  for cases that you examined first.
- `--allow-tools` lets the workflows run git and write their findings files
  in the Claude Code sandbox.
- `--no-publish` keeps the HTML report on your machine. Without this option,
  a claude.ai login publishes the report as a private artifact.
- On macOS, `/usr/bin/git` is a shim that the sandbox blocks. Put a git that
  the sandbox can read, for example the git from Homebrew, at the start of
  `PATH`. The
  `git-worked` grader fails a run that used the shim.
- The cases need Node 22.18 or later to run the `.ts` tests. Below your home
  folder, the sandbox can read only the folders on `PATH`. A Node from a
  version manager, for example mise or nvm, keeps npm in `lib/`. Its
  `bin/npm` is only a link or a wrapper that starts that npm, so the sandbox
  blocks npm. Put the root folder of that Node on `PATH` too:

  ```sh
  node_root=$(dirname "$(dirname "$(node -p process.execPath)")")
  PATH="$node_root:$node_root/bin:$PATH" claude plugin eval …
  ```

  The eval run does not keep other environment variables. Thus each fixture
  with npm scripts sources `evals/_shared/npmrc.sh`, which writes an
  `.npmrc` that npm can use in the sandbox.
- Run the evals from a path that has only ASCII characters. In a folder with
  other characters in its name, Claude puts quotes around the paths in the
  commands that it runs. This breaks graders that look for a command line, for example
  `renders-part-1` in `split-writes-the-parts-and-an-index`. Also, the
  sandbox can prevent access to the plugin. Copy `plugins/` to `$TMPDIR`.
  Then use the copy with `eval_kit`.

## Branches

- `mochitsuki` is the integration branch. Branch off it with a
  `<type>/<slug>` branch, and open the pull request against it. GitHub
  proposes `main` as the base, so change the base to `mochitsuki`. Dependabot
  also opens its pull requests against `mochitsuki`.
- `main` holds only releases and hotfixes. Each commit on `main` is a
  release, so a plugin install from `main` always gets the latest release.
  Only a `release/1.x.y` branch or a hotfix branch targets `main`.
- Both branches take only squash merges. A squash does not put the commits of
  one branch into the history of the other, so `main` never merges
  `mochitsuki`. A release copies the files of `mochitsuki` to `main` instead,
  as [Release](#release) says.
- A hotfix goes to `main` first, and then to `mochitsuki` as a cherry-pick.
  Without the cherry-pick, the next release removes the fix from `main`.

Two branch rulesets protect the branches:

| Ruleset | Branch |
|---|---|
| Mendicant Bias | `main` |
| Exuberant Witness | `mochitsuki` |

Each one requires a pull request with a squash merge, signed commits, linear
history, and the `Analyze`, `Skill map` and `Hook tests` checks. Each one also blocks force
pushes and deletion.

## Release

1. Run the evals for a release on `mochitsuki`, as [Evals](#evals) says.
2. Create a `chore/release-1.x.y` branch from `mochitsuki`. On it:
   - Set the same version in the three `.claude-plugin/plugin.json` files.
   - Replace "unreleased" in the `CHANGELOG.md` heading with the date, for
     example `## 1.x.y — YYYY-MM-DD`.
   - Add the runs of step 1 to `evals/history.tsv` with
     `scripts/eval-history.mjs`, as [Evals](#evals) says.

   Run `node scripts/release-notes.mjs 1.x.y`. It shows the release notes,
   or the problem that stops them. Then open the pull request against
   `mochitsuki` and squash-merge it.
3. Copy the files of `mochitsuki` to a `release/1.x.y` branch from `main`:

   ```bash
   git fetch origin
   git switch -c release/1.x.y origin/main
   git restore --source=origin/mochitsuki --staged --worktree :/
   git commit -m "chore(release): 1.x.y"
   git push -u origin release/1.x.y
   ```

   `git restore` also removes the files that `mochitsuki` deleted, so the
   files of the branch are the same as the files of `mochitsuki`.
4. Open the pull request from `release/1.x.y` to `main`, with the title
   `chore(release): 1.x.y`. Its diff is the full release. When the diff
   removes a line of a hotfix, the cherry-pick of that hotfix is missing:
   stop and do it first. Squash-merge the pull request.
5. Sign a tag on the squashed commit on `main` and push it:

   ```bash
   git switch main && git pull
   git tag -s v1.x.y -m "Negima Mochi 1.x.y"
   git tag -v v1.x.y   # reports a good signature from your key
   git push origin v1.x.y
   ```

   The tag uses the signing key that you use for your commits. The tag
   ruleset blocks a change to a tag after the push, so do the check before
   the push.

   The GitHub workflow `Release` then checks that the tag is on `main`,
   runs the script tests, the skill map check and the notes script, and
   publishes the release with those notes. An immutable release keeps its
   tag, so the workflow stops before it publishes when something does not
   agree.

For a hotfix:

1. Create a `fix/<slug>` branch from `main`. In it, set the next patch
   version and add its `CHANGELOG.md` section, as step 2 says.
2. Run `node scripts/release-notes.mjs 1.x.y`. Open the pull request against
   `main`, with the title `fix(<scope>): <subject>`, and squash-merge it.
3. Sign and push the tag, as step 5 says.
4. Cherry-pick the squashed commit to `mochitsuki`:

   ```bash
   git fetch origin
   git switch -c fix/<slug>-mochitsuki origin/mochitsuki
   git cherry-pick <squashed commit on main>   # resolve a conflict in CHANGELOG.md, then git cherry-pick --continue
   git push -u origin fix/<slug>-mochitsuki
   ```

   Open its pull request against `mochitsuki` and squash-merge it.
