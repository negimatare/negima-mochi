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

## Evals

Each plugin has an eval suite in its `evals/` folder. Run it with
`claude plugin eval`. Each case has these steps:

1. Its `fixture.sh` builds a small repository.
2. The case sends one request.
3. The graders examine the reply, the files that Claude wrote and the tools
   that Claude used.

The workflow cases send the text that a user types. The reviewer cases call
the reviewer directly, to test the agent alone.

When you change the behaviour of a skill or an agent, add or update a case
that fails on the old version. No check enforces this rule, but it is how a
kit change gets a test.

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

# After you change a skill or an agent: its tagged cases, one time on each
# model, no baseline. $0.05 to $0.70 for each case; build cases cost the most.
eval_kit ./plugins/mochi --tag commit --runs 1 --ablation none --max-cost-usd 5
M=claude-sonnet-5-5 eval_kit ./plugins/mochi --tag commit --runs 1 --ablation none --max-cost-usd 5

# Before a release, or when the default model changes: all cases one time on
# each model, with the no-plugin baseline on Opus. Approximately $13 for mochi.
eval_kit ./plugins/mochi --runs 1 --max-cost-usd 20
M=claude-sonnet-5-5 eval_kit ./plugins/mochi --runs 1 --ablation none --max-cost-usd 10
```

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

### Shared fixtures

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
  disable git hooks, so this script gives two different signals to the
  graders:
  - `npm test` writes a line to `.eval/test-runs.log` for each run.
  - Packed refs make a commit to `main` create a `refs/heads/main` file,
    which `file_exists` can see.
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
  `git-worked` grader of each case fails a run that used the shim.
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
