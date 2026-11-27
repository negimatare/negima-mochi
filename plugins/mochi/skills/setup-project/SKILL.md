---
name: setup-project
description: Create or refresh a project's CLAUDE.md so the mochi plugins have what they rely on — the stack, the real verification commands, overrides of conflicting ancestor instructions, and the rules that only apply to this project. Run once per project or package, and again when its tooling changes.
argument-hint: "[folder, default: current directory] [anything you already know to put in]"
disable-model-invocation: true
---

# Set up a project

The user's arguments: `$ARGUMENTS`

The output is one `CLAUDE.md` in the target folder, under about 60 lines. It
holds only what is specific to this project. General rules live in the mochi
plugins and are never copied into it.

## 1. Pick the folder

The folder in the arguments, else the current directory. In a monorepo, a
package with its own `package.json`, `pyproject.toml`, or `go.mod` gets its own
`CLAUDE.md`. If a `CLAUDE.md` already exists there, read it: you will propose
changes to it, never overwrite it silently.

## 2. Detect what the code already says

Read, do not ask:

- **Language and stack** from the manifest files. Note React + Fluent UI
  (`react` and `@fluentui/react-components`) and FastAPI (`fastapi` in
  `pyproject.toml`), and recommend installing `mochi-react` or
  `mochi-python` if it is not.
- **Stack plugin rules**: load every skill of each installed stack plugin
  that matches the stack with the Skill tool (for example all `mochi-react:*`
  skills). Its hooks only inject them when Claude touches a matching file, so
  without this step you cannot tell which rules the plugin already states.
- **Package manager** from the lockfile. For Python, the verification
  commands go through its runner: `uv run` with `uv.lock`, `poetry run` with
  `poetry.lock`, `pipenv run` with `Pipfile.lock`. With a lockfile, a
  package is never added with a bare `pip install`.
- **Verification commands**: the typecheck, lint, and test scripts (or the
  Makefile targets) and what each really runs. Watch for traps such as a
  solution-style `tsconfig.json` (`"files": []` plus references), where a bare
  `tsc --noEmit` checks nothing.
- **CI before a push**: the jobs in `.github/workflows/` that run on
  `pull_request`. Their local commands that the verification commands do not
  already run go into the file as "Before a push to an open PR". Leave out
  deploy steps, steps that need a secret, and steps that need a service, and
  note each job that cannot run locally.
- **Build targets** when there is no single build command.
- **A runtime check**: a script that opens the app on fakes and saves its
  screens (for example a `drive` script, or a Playwright run on a mock
  server). Name it in the Runtime check section only when it exists; never
  write one here, and with a UI but no such script, say so once.
- **The integration branch**, when pull requests go to a branch other than
  the one `origin/HEAD` names (for example a `develop`, while `main` holds
  releases): ask, and write it as the line ``Integration branch: `<name>` ``
  in the `CLAUDE.md` at `git rev-parse --show-toplevel` only, as the
  scripts read that file. For a package, propose it for the root file.
- **Path aliases** in `tsconfig*.json` and bundler configs, and whether they
  must stay in sync across files.
- **Lint config**: what it enforces (boundaries, hook rules, accessibility,
  property order), so the file can say what reviewers may skip.
- **Dead-code tool**: knip (TypeScript or JavaScript) or vulture (Python) in the dev
  dependencies, the command that runs it, and whether its config names what
  the tool cannot discover: extra entry points such as a second HTML page in
  the bundler config (knip `entry`), and framework decorators that register
  code (vulture `ignore_decorators` or a whitelist file). The command runs the
  installed copy (a package script, `uv run vulture`), never `npx`, `uvx`, or
  `pipx run`, which download the tool when it is not installed.
- **Ancestor instructions**: every `CLAUDE.md` in the folders above, the files
  they import, and the repository's `.claude/rules/`. When one describes
  another stack or contradicts this project, the new file must override it by
  name.
- **Rules enforced outside Claude**: for each ancestor rule the override
  excludes, check whether CI, a merge-queue reviewer, or a hook also enforces
  it (grep `.github/workflows/` and the hook configs for the rule's file or
  folder). The override only binds Claude, so such a rule still fails pull
  requests for this folder: tell the user, and suggest scoping the rule at its
  source.
- **Existing docs**: a `docs/` folder or README sections worth routing to.

## 3. Ask only what code cannot tell

In one round of questions, at most four, skipping anything the arguments
answer:

- Decisions specific to this project that a newcomer would get wrong.
- Sibling projects to check before adding a dependency.
- Manual checks the tests cannot do (for example a two-client smoke test).
- Areas that are out of bounds or owned by another team.

## 4. Write it

Follow [the template](assets/template.md). Drop a section that would be
empty. Each rule is one or two lines with its reason.

Before showing the file, check every rule against the mochi principles and the
stack skills you loaded. A rule they already state is dropped; a rule that
adds a project detail (a name, a path, an exception) keeps only that detail.

Without a dead-code tool, propose adding the stack's one as a pinned dev
dependency, with a config that names the missing entry points or decorators,
and add it after the user agrees, following the `dependencies` skill. If the
user declines, drop the section.

When a stack skill you loaded names a preset
(`<plugin root>/presets/<file>`), the preset holds that plugin's lint rules:
propose it before any rule of the skill text, and use the steps for a
single lint rule below only for rules outside it. Edit nothing before the
user agrees.

- **ESLint preset** (a `.mjs` module). List its rules and the ESLint plugins
  it needs. After the user agrees, add the missing plugins with the
  `dependencies` skill, copy the file unchanged beside the package's
  `eslint.config.*`, and spread it in the config's array before the
  project's own entries. Prove the layers: add one import from one feature
  slice into another, check that lint reports it, and remove the import.
  With fewer than two feature slices, add an import of a feature or a page
  to a file of `lib/` instead. When lint does not report it, the preset
  does not fit this package: remove the copy and the spread, so that the
  package is as it was, stop, and tell the user. Then run lint, report the
  violations by file, and ask error or warn as the steps for a single lint
  rule below say. Write the levels and the overrides in the project's
  config after the spread, never in the copy.
- **Ruff preset** (a `.toml` file of keys). First find the file that Ruff
  uses for the project: `ruff check --show-settings <a Python file>` names
  it. When that file is in a folder above the project, ask whether to merge
  there, or to give the project its own Ruff table that extends it. Then
  run Ruff with the preset's rules from the command line, without a write:
  `--extend-select` with its codes, and `--config` with each of its tables.
  Report the violations by file. Ruff has no `warn`: for each rule with
  violations, ask whether to turn it on with a commented per-file ignore
  for each file that breaks it today, or to leave it out. After the user
  agrees, merge the keys into that file: under `[lint]` in `ruff.toml` or
  `.ruff.toml`, under `[tool.ruff.lint]` in `pyproject.toml`. Keep the
  project's own `select`.
- When the project already has each rule of the preset with a setting, say
  that the preset is in place. When the preset has a rule that the project
  lacks, propose only that difference.

When a stack skill you loaded sets a lint rule the project's lint config
lacks, list each rule with its setting and propose adding it. Run lint with
the rule first and report how many existing violations it finds, and in
which files. With none, propose it as `error`. With any, ask which the user
wants: `error`, with a commented override for each file that breaks it today,
so new code is held to the rule and lint keeps passing; or `warn`. Add the
rules as the stack skill writes them, with no comments of your own beyond
those overrides. Edit the config only after the user agrees. A rule from a
plugin the project does not have yet is a new dependency, and follows the
`dependencies` skill.

Show the user the file (or the diff against the existing one) and write it only
after they agree.

## 5. Prove it

Run every verification command the file lists, and each command of its
"Before a push to an open PR" list, one time, from the folder it names, and
report the result. A command that fails or does not exist goes back to the
user before the file is final.

Run the dead-code command too. Findings in existing code are expected and do
not block the file, but an item the tool reports only because it cannot see
an entry point or a decorator goes into its config now, after the user agrees.

## 6. Ignore the working folders

Check `.plans/` and `.reviews/` with `git check-ignore -q`, one path at a time
and with the trailing slash: without it, a folder that does not exist yet
reads as not ignored. For each one not ignored, propose where to add it, and
add it after the user agrees:

- the project's `.gitignore` when the team uses the kit (the plugins are
  enabled in the committed `.claude/settings.json`);
- otherwise `$(git rev-parse --git-common-dir)/info/exclude`, which stays on
  this machine and changes nothing for teammates.
