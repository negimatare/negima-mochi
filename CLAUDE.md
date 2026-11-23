# Negima Mochi

The kit repository: three Claude Code plugins in `plugins/`. There is no
`package.json` and no dependency to install.

## Verification

Run from the repository root before you call a change done:

```bash
node --test tests/*.test.mjs        # hook and script tests, no model call
node scripts/skill-map.mjs --check  # fix with node scripts/skill-map.mjs
claude plugin validate .
claude plugin validate ./plugins/mochi
claude plugin validate ./plugins/mochi-react
claude plugin validate ./plugins/mochi-python
```

Evals are model calls, not verification: CONTRIBUTING's Evals section gives
the cases to run.

## Where the rules live

`CONTRIBUTING.md` has the layout, the evals, the branches and the release
steps. When the mochi plugin is not loaded, follow
`plugins/mochi/skills/<name>/SKILL.md` directly.

## Project-specific rules

- `mochitsuki` is the integration branch. When a mochi skill says "the
  default branch", it means `mochitsuki` here: branch off it, and open each
  pull request against it (`/mochi:pr mochitsuki`).
- Examples, eval fixtures and skill text use a made-up domain, for example a
  shop. The repository is public: no names from a real codebase.
- Keep the correctness, test, data and quick reviewers on `model: inherit`.
  Pinned to Sonnet, they cost more in each eval case.
- A pull request body fills `plugins/mochi/skills/pr/assets/pr-body.md`, not
  `.github/pull_request_template.md`. Write each paragraph on one line:
  GitHub shows each newline as a line break.
- A `CHANGELOG.md` release: a short intro, `### Update` only when users must
  do a step, one `### <name> plugin` for each changed plugin, then `### For
  contributors`. Each item starts with a bold lead. No test details.
- Write a version in a docs example as `1.x.y`, and its tag as `v1.x.y`.
  Never use a real release: it goes out of date, and readers copy it.
- In the README, only the opening paragraph can be creative. Each badge links
  to its target and shows something useful.
