---
name: commit
description: Commit the current work — pull first, split unrelated changes into separate commits, stage by explicit path, verify, and write semantic messages that explain why. Pushes only when the caller asks, and then to a feature branch, never to the default branch. Use when the user asks to commit, and from the mochi workflows that commit their slices.
argument-hint: "[optional: what to include, how to split, or \"push\"]"
user-invocable: false
---

# Commit

The user's notes: `$ARGUMENTS`

## 1. Look

Run `git status`, `git diff`, `git diff --cached`, and `git log --oneline -10`
(the repo's message style and scopes are a model to follow where they are
sound). Nothing to commit: say so and stop.

## 2. Pull first

If the branch tracks a remote, `git pull --rebase --autostash` — reviewers may
have pushed suggestions. On a conflict, stop and show it; do not resolve it by
picking a side.

## 3. Group

One concern per commit: a change that can be accepted or reverted without the
other is a separate commit. Propose the split when the work mixes concerns.
A workflow committing one slice gets one commit for it, without a proposal.

Stage by explicit path — never `git add -A` or `git commit -a`. Leave working
state out: `.plans/`, `.reviews/`, scratch files, anything the user did not
ask to include.

## 4. Verify

Run the project's verification commands from its `CLAUDE.md`, unless they
already passed on exactly these changes in this session. Docs-only commits
skip this.

## 5. Write the message

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
Changelogs may be generated from it, so the format is strict:

```
<type>(<scope>): <subject> [<TICKET-123>]

<body>

<footer>
```

- **type** (required): `feat`, `fix`, `perf`, `refactor`, `revert`, `test`,
  `docs`, `style` (formatting only), `build` (build system, dependencies),
  `ci`, or `chore` (anything else, for example `chore(deps)`). Add `!` after
  the type or scope for a breaking change.
- **scope** (optional): one only, kebab-case, as specific as possible — the
  product, component, feature, or library affected.
- **subject** (required): imperative present tense ("change", not "changed"),
  lowercase first letter, no period, at most 72 characters counting type and
  scope. Suffix the tracker ticket ID in brackets when the work has one (from
  the branch, the commits, or the user). Suffix `[skip-changelog]` for a
  change that must not reach the changelog.
- **body** (optional): the motivation, contrasted with the previous behaviour.
  Imperative present tense, wrapped at 72, several paragraphs when needed.
  Not what the diff already shows.
- **footer** (optional): `BREAKING CHANGE: <what breaks and how to migrate>`,
  `DEPRECATED: <what>` then a blank line and the update path, and
  references such as `Refs: #123` or `Closes: #123`. Add any trailer the
  session's instructions require.
- Never name a customer, other sensitive information, or an internal code name
  of a system — describe what it does instead.
- STE, by the **Writing** section of
  `${CLAUDE_PLUGIN_ROOT}/principles.md`. The project's own commit guideline
  wins wherever its `CLAUDE.md` names one.

## 6. Branch, when the caller pushes

Find the default branch with `git symbolic-ref refs/remotes/origin/HEAD`;
never assume `master` or `main`. If the caller asked to push and the current
branch is the default branch, create a feature branch with
`git switch -c <type>/<slug>` before committing — `<type>` from the commit,
`<slug>` from the plan file name without its date, else from the subject: a
`feat` commit for `.plans/20261105-member-discount.md` goes on
`feat/member-discount`. The type prefix
is required. Uncommitted changes move with it. When the caller says the work
is stacked on a branch and that branch is checked out, create the feature
branch from it the same way, so that the base keeps only its own commits. On
any other branch, stay.

## 7. Commit

If a hook fails, fix the cause, restage, and retry — never `--no-verify`.
Confirm with `git log --oneline -n <commits made>`.

## 8. Push, only when the caller asks

Without a request to push, stop here and say the commits are ready to push.

Otherwise, when the branch has an open pull request
(`gh pr view <branch> --json state` gives `OPEN`, or the caller says so),
run the **push checks** first: the verification commands, unless step 4 ran
them, and the "Before a push to an open PR" list of the project's
`CLAUDE.md`. A failure stops the push: name the command that failed, and
push only when the user says so. Without `gh`, and with no word from the
caller, say one time that you cannot tell, and push without the list. When
the `CLAUDE.md` has no such list, say so one time and suggest
`/mochi:setup-project`.

Then push the feature branch: `git push -u origin <branch>` the first
time, `git push` after. Never push the default branch and never force: a
rejected push goes back to the user. With no remote, say so and stop.
