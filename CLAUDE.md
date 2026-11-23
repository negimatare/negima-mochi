# Negima Mochi

A Claude Code plugin marketplace with three plugins: `mochi`, `mochi-react`
and `mochi-python`. The plugins are Markdown skills and agents, with hook
scripts in Node.js (`.mjs`). The repository scripts are in `scripts/`, and
their tests are in `tests/` (`node:test`). There is no `package.json` and no
dependency.

## Verification

Run from the repository root before you call a change done:

```bash
node --test tests/*.test.mjs        # hook and script tests, no model call
node scripts/skill-map.mjs --check  # each link between skills has a note; fix with node scripts/skill-map.mjs
claude plugin validate .            # the marketplace
claude plugin validate ./plugins/mochi
claude plugin validate ./plugins/mochi-react
claude plugin validate ./plugins/mochi-python
```

Evals are model calls, not verification. CONTRIBUTING's Evals section gives
the cases to run for a change and for a release.

## Before a push to an open PR

Verification runs the local commands of the `Hook tests` and `Skill map` CI
jobs. `CodeQL` runs only on GitHub.

## Where the rules live

General conventions come from the `mochi` plugin in `plugins/mochi`. In a
session in this repository, the plugin is usually not loaded: read
`plugins/mochi/skills/<name>/SKILL.md` and follow it.

| Working on | Read |
|---|---|
| Layout, skill map, hook tests, evals, branches, release | `CONTRIBUTING.md` |
| What each workflow does for a user | `docs/workflows.md` |

## Project-specific rules

- `mochitsuki` is the integration branch. When a mochi skill says "the
  default branch", it means `mochitsuki` here: branch off it, and open each
  pull request against it (`/mochi:pr mochitsuki`). Only a release branch and
  a hotfix target `main`, as CONTRIBUTING's Branches section says.
- Sign each release tag (`git tag -s`). The tag ruleset blocks a fix after the push.
- Examples, eval fixtures and skill text use a made-up domain, for example a
  shop. The repository is public: no names from a real codebase.
- Keep the correctness, test, data and quick reviewers on `model: inherit`.
  Pinned to Sonnet, they passed the evals but cost more in each case, because
  they took more turns and did not share the prompt cache of the main thread.
- A pull request body fills `plugins/mochi/skills/pr/assets/pr-body.md`, not
  the sections of `.github/pull_request_template.md`. Put no "Stacked on"
  line in it. Write each paragraph on one line, because GitHub shows each
  newline as a line break.
- Each `CHANGELOG.md` release has a short intro. `### Update` comes first,
  only when users must do a step. Next comes one `### <name> plugin` heading
  for each changed plugin, with `####` topics when it has several. `### For
  contributors` is last. Each item starts with a bold lead. Give no test
  details: no case names and no run counts.
- Write a version in a docs example as `1.x.y`, and its tag as `v1.x.y`.
  Never use a real release: it goes out of date, and readers copy it.
- In the README, only the opening paragraph can be creative. Each badge links
  to its target and shows something useful: the release, the licence, CI or
  CodeQL.
