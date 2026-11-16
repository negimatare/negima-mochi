<p align="center">
  <img src="docs/banner.png" alt="Negima Mochi: small requests, well-engineered changes. A smiling mochi in a belt ring, circled by reviewer drones.">
</p>

Claude Code plugins that turn a short request into the way a careful engineer
works: plan first, write the failing test, keep the change tidy, review it
area by area, and commit with a message that says why.

You write `/mochi:build add a CSV export to the orders page`. The kit
supplies the rest: the questions to ask, the standard to hold the code to,
and the points where it stops for you.

## What a session looks like

Claude asks one round of questions, then writes a plan to `.plans/` with
acceptance scenarios, verified facts, and the slices it will build. A
bar-raiser agent challenges the plan before any code exists. Claude opens an
HTML view of it, with a data-flow diagram and, for frontend changes, each
screen before and after, and you approve it.

Each slice starts with a test that fails for the right reason. Claude writes
the code, runs your project's typecheck, lint, and tests, tidies what it
touched, then commits and pushes the slice to a feature branch. Nothing goes
to the default branch.

When the slices are done, reviewers go through the branch one area at a time:
correctness, tests, hygiene, and your stack's conventions. Each finding is
graded 🔴 Critical, 🟠 High, 🟡 Medium, or 🔵 Minor, and you pick which to
fix. `/mochi:pr` then drafts the pull request.

## Install

From the project you want to use it in:

```bash
claude plugin marketplace add negimatare/negima-mochi
claude plugin install mochi@negima-mochi --scope local
claude plugin install mochi-react@negima-mochi --scope local   # React + Fluent UI projects only
claude plugin install mochi-python@negima-mochi --scope local  # FastAPI services only
```

`--scope local` keeps the install in your gitignored
`.claude/settings.local.json`, so teammates are unaffected. Then run
`/mochi:setup-project` once. It writes a short `CLAUDE.md` with the project's
real verification commands and checks that each one works.

| Plugin | What it adds |
|---|---|
| `mochi` | The workflows, the working principles, generic reviewers, and a dependency policy. Works with any language. |
| `mochi-react` | Conventions, reviewers, and lint and test hooks for React with Fluent UI v9 and Griffel. It has no commands; it joins the `mochi` workflows. |
| `mochi-python` | Conventions, reviewers, and lint and test hooks for FastAPI services: vertical slices with a Cosmic Python domain model inside, REST rules, and a committed OpenAPI spec. It has no commands; it joins the `mochi` workflows. |

The kit adds no MCP servers, hosted review, or CI changes. Its hooks run
local commands, and it only runs tools installed in your project.

## Commands

| Command | Use it to | It stops for you to |
|---|---|---|
| `/mochi:setup-project [folder]` | Prepare a project or package | Approve its `CLAUDE.md` |
| `/mochi:build <request or plan>` | Build a feature or change | Approve the plan, then pick review findings |
| `/mochi:refactor <area> [goal]` | Improve code without changing behaviour | Pick candidates, then approve each plan |
| `/mochi:fix-bug <report>` | Fix a bug, test first | Confirm the cause and the fix |
| `/mochi:review [PR or branch]` | Review any change | Pick findings after each area |
| `/mochi:pr` | Open the pull request, or restack a stacked part | Approve the body and its comments, and any force-push |
| `/mochi:split <plan>` | Cut a plan that is too big into parts, one pull request each | Accept the parts, built in order or stacked |

Write requests the way you would brief a colleague, including what is already
decided and what to skip. [docs/workflows.md](docs/workflows.md) walks
through each command.

### What each command runs

![Which command runs which skill, agent, and convention](docs/skill-map.svg)

Dashed lines run only when a condition holds. Open
[docs/skill-map.html](docs/skill-map.html) in a browser to hover a command, read
each condition, and see the same links as a table.

## In the background

- Every session starts with the working principles in context, and a new
  one opens with a banner from one of the reviewer monitors. Set
  `MOCHI_BANNER=0` to hide it.
- A command that adds or upgrades a package asks for permission first and
  points Claude at the dependency policy. Installs from the lockfile pass.
- In React + Fluent packages, `mochi-react` adds its conventions to context
  when a session starts there, or, in a session started elsewhere, when Claude
  touches a file one covers. It runs ESLint `--fix` on each edit, and runs
  `typecheck` and `test` before Claude ends a turn.
- In FastAPI packages, `mochi-python` does the same with the tools in the
  project's virtualenv: Ruff `--fix` on each edit, and the type checker
  (pyright or mypy), the import-linter contracts, and pytest before Claude
  ends a turn.

## Reviewers

Each reviewer is named after a Forerunner monitor; the transcript shows its
role next to the name.

| Agent | Checks | Plugin |
|---|---|---|
| `05-032-mendicant-bias` | The plan, before code is written | `mochi` |
| `117649-despondent-pyre` | Correctness: logic, error paths, security | `mochi` |
| `049-abject-testament` | Tests: the most protection at the least cost | `mochi` |
| `2401-penitent-tangent` | Hygiene: dead code, stale comments, rename leftovers | `mochi` |
| `031-exuberant-witness` | Data: indexes, statement timeouts, query fan-out, migrations | `mochi` |
| `859-static-carillon` | Accessibility of any markup, when no stack plugin reviews it | `mochi` |
| `343-guilty-spark` | React, Fluent UI, and Griffel conventions lint cannot check | `mochi-react` |
| `000-tragic-solitude` | Accessibility gaps lint cannot see | `mochi-react` |
| `686-ebullient-prism` | Slices, domain model, layers, and tests in FastAPI services | `mochi-python` |
| `295-harken-watch` | The API contract: breaking changes, errors, pagination, OpenAPI | `mochi-python` |

## Where the rules come from

The most specific source wins: your project's `CLAUDE.md`, then the stack
plugin, then the [mochi principles](plugins/mochi/principles.md). Existing
code counts only for consistency, never as the quality bar. When two sources
disagree, Claude says so and asks.

## More

- [docs/workflows.md](docs/workflows.md): each command step by step, branch
  and commit rules, and a repository with a frontend and a backend.
- [CONTRIBUTING.md](CONTRIBUTING.md): working on the kit, its layout, and its
  eval suite.
- [CHANGELOG.md](CHANGELOG.md): what each release changed.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md): how to
  take part, and how to report a vulnerability privately.

## License

[MIT](LICENSE)
