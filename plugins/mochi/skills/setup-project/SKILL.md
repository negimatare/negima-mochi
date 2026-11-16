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
- **Build targets** when there is no single build command.
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

Run every verification command the file lists, from the folder it names, and
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
