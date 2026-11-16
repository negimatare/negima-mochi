# Working on the kit

## Run it from a checkout

Load the plugins without installing them:

```bash
claude --plugin-dir ./plugins/mochi --plugin-dir ./plugins/mochi-react --plugin-dir ./plugins/mochi-python
```

After changing an installed copy, run
`claude plugin marketplace update negima-mochi`. Run
`claude plugin validate ./plugins/mochi` (and each stack plugin) after
changing a manifest, a frontmatter, or a hook.

## Layout

The kit follows the Claude Code plugin layout and the
[Agent Skills specification](https://agentskills.io/specification).

- **Workflows are skills, not commands.** Claude Code merged commands into
  skills and recommends `skills/` for new plugins. A workflow only the user
  starts sets `disable-model-invocation: true`. Steps the workflows share
  (`plan`, `tidy`, `commit`) and a stack plugin's conventions set
  `user-invocable: false`, so they stay out of the `/` menu.
- **Reviewers are agents** in `agents/`. An agent names the plugin files it
  reads with `${CLAUDE_PLUGIN_ROOT}`.
- **An agent's colour is its role**, the same in every plugin, so the
  reviewers of one step never share one: purple plan, red correctness, green
  tests, yellow hygiene, orange data, cyan accessibility, blue stack
  conventions, pink API contract. Claude Code has only these eight colours; a
  new role reuses the one closest to it.
- **Text every session and agent needs** lives at the plugin root, like
  `principles.md`. A `SessionStart` hook prints it, and agents read it by its
  `${CLAUDE_PLUGIN_ROOT}` path.
- **Hook scripts** live in the plugin's `scripts/`, next to `hooks/`.
- **A skill is one `SKILL.md` until it needs more.** Add the specification's
  folders only when a file needs a home: `assets/` for templates,
  `references/` for detail moved out of a `SKILL.md` past about 200 lines
  (Anthropic's guidance is under 500), and `scripts/` for a deterministic
  step the skill runs through `${CLAUDE_SKILL_DIR}`. Link each file from
  `SKILL.md`, one level deep. Name a file in another skill by its
  `${CLAUDE_PLUGIN_ROOT}` path, never by `../`.

### When a convention loads

A stack plugin's hook loads a convention when Claude touches a file matching
its `paths:` patterns, once per session. A convention for one library also
names the packages it needs, space-separated in double quotes, and loads only
in packages that depend on all of them:

```yaml
metadata:
  mochi-requires: "react-hook-form zod"
```

### The skill map

`docs/skill-map.svg` and `docs/skill-map.html` show which command runs which
skill, agent, and convention. `scripts/skill-map.mjs` finds the links in the
plugins' own files: a skill that runs or follows another, a `/mochi:` command
it runs, a `SKILL.md` path it reads, an agent it launches, and what each hook
points to. `docs/skill-map.notes.json` holds what the files cannot say: each
box's subtitle, each link's condition or note, and the order of the boxes.

Run `node scripts/skill-map.mjs` after changing which skill runs what. It
redraws both files, and it stops with a list when the notes and the plugins
disagree: a link with no note, a note for a link that no file has, or a part
with no subtitle. Claude does this for you in this repository: the hook in
`.claude/settings.json` redraws the map after each file Claude writes or edits
under `plugins/`.
On every push, the `Skill map` GitHub workflow runs `--check`, which fails
when the committed map is out of date.

## Evals

Each plugin keeps an eval suite in its `evals/`, run with
`claude plugin eval`. A case builds a small repository with its `fixture.sh`,
sends one request, and grades the reply, the files Claude wrote, and the
tools it called. The workflow cases send what a user would type; the
reviewer cases call the reviewer directly, to test the agent on its own.

When you change what a skill or an agent does, add or update a case that
fails on the old version. Nothing enforces this; it is how a kit change gets
a test.

Every run is a real model call, billed to your API or cloud account or
counted against your plan. Pin both models, so a model update is not mistaken
for a regression:

```bash
M=claude-opus-5-5     # on Bedrock: global.anthropic.claude-opus-5-5
J=claude-sonnet-5-5   # judge for llm graders; on Bedrock: global.anthropic.claude-sonnet-5-5
eval_kit() {  # eval_kit <plugin dir> [claude plugin eval options]
  claude plugin eval "$1" --model "$M" --judge-model "$J" \
    --scaffold --allow-tools Bash Write Edit --no-publish "${@:2}"
}

# After changing a skill or an agent: its tagged cases, once on each model,
# no baseline. $0.05 to $0.70 per case; build cases cost the most.
eval_kit ./plugins/mochi --tag commit --runs 1 --ablation none --max-cost-usd 5
M=claude-sonnet-5-5 eval_kit ./plugins/mochi --tag commit --runs 1 --ablation none --max-cost-usd 5

# Before a release, or when the default model changes: every case once on
# each model, with the no-plugin baseline on Opus. About $13 for mochi.
eval_kit ./plugins/mochi --runs 1 --max-cost-usd 20
M=claude-sonnet-5-5 eval_kit ./plugins/mochi --runs 1 --ablation none --max-cost-usd 10
```

Anthropic's skill guidance asks for at least three cases per skill, tested on
every model the kit supports, which for now is Opus and Sonnet. Run a new
case once with the baseline. A case the no-plugin run also passes still
guards against a regression, but shows nothing the kit adds: its
description says so.

Tags name what a case exercises: `plan`, `build`, `split`, `fix-bug`,
`commit`, `pr`, `setup`, `dependencies`, `review`, `refactor`, `tidy`,
`correctness`, `tests`, `hygiene`, `data`, and `a11y` in `mochi`; in
`mochi-react`, one per convention skill (`architecture`, `components`,
`forms`, `i18n`, `performance`, `state`, `testing`), plus `conventions` and
`a11y` for its two reviewers; in `mochi-python`, one per convention skill
(`architecture`, `domain`, `service-layer`, `api-design`, `openapi`,
`persistence`, `testing`), plus `conventions` and `api-contract` for its two
reviewers.
`smoke` marks the cheapest case.

The `mochi-react` cases source `evals/_shared/shop-web.sh`, a React + Fluent
orders app laid out the way the `architecture` skill describes. It has no
`node_modules`, so nothing builds or runs: graders read the files Claude
writes and the reviewers' findings.

The `mochi-python` cases source `evals/_shared/shipping-api.sh`, a FastAPI
shipping service laid out the way its `architecture` skill describes, with a
committed `openapi.json` and a fake unit of work. It has no `.venv`, so
nothing runs during a case either. Outside a case it type-checks, lints,
passes its import contracts and its tests: keep it that way when you change
it, and regenerate the `openapi.json` it embeds from the app.

A case loads exactly the plugins its `plugins:` frontmatter lists, which
replace the plugin under test, and only from inside that plugin. A `mochi`
case that needs a stack plugin ships a stub in a subfolder of its own and
lists both, as `setup-adds-lint-rules-without-comments` does:
`plugins: ["../..", "./size-stack"]`.

Eval runs reach no network and have no logged-in `gh`, so cases cannot
install packages or open pull requests. The `pr` and `dependencies` cases
test what happens before those calls, and what the kit does when they fail.

Cases that commit or push source `evals/_shared/shop-lib.sh`. Eval runs
switch off git hooks, so it gives graders two other signals: `npm test` logs
each run to `.eval/test-runs.log`, and packed refs make any commit to `main`
create a `refs/heads/main` file that `file_exists` can see.

- `--scaffold` runs each `fixture.sh`, and the `evals/_shared/` scripts it
  sources, as you and outside the sandbox. Pass it only for cases you have
  read.
- `--allow-tools` lets the workflows run git and write their findings files,
  inside Claude Code's sandbox.
- `--no-publish` keeps the HTML report local. With a claude.ai login it is
  otherwise published as a private artifact.
- On macOS, `/usr/bin/git` is a shim the sandbox blocks. Put a git the
  sandbox can read first on `PATH`, such as Homebrew's. Each case's
  `git-worked` grader fails a run where the shim ran instead.
