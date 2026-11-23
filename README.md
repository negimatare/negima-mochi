<div align="center">

<img src="docs/readme/banner.png" alt="Negima Mochi: any idea, well-crafted solutions. A pixel-art mochi types at a desk beside a checklist, a green status light, a cup of coffee and a sleeping cat." width="100%">

# Negima Mochi

**Any idea. Well-crafted solutions.**

[![Latest release](https://img.shields.io/github/v/release/negimatare/negima-mochi?style=flat-square&label=release&color=efe3c8)](https://github.com/negimatare/negima-mochi/releases/latest)
[![Licence](https://img.shields.io/github/license/negimatare/negima-mochi?style=flat-square&label=licence&color=c9a0dc)](LICENSE)
[![Skill map](https://img.shields.io/github/actions/workflow/status/negimatare/negima-mochi/skill-map.yml?branch=main&style=flat-square&label=skill%20map)](https://github.com/negimatare/negima-mochi/actions/workflows/skill-map.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/negimatare/negima-mochi/codeql.yml?branch=main&style=flat-square&label=CodeQL)](https://github.com/negimatare/negima-mochi/actions/workflows/codeql.yml)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-3%20plugins-f0a830?style=flat-square)](#install)

</div>

<br>

Bring Mochi an idea, however rough. It pours a coffee, pins a checklist to
the wall and keeps its hands off the keyboard until the plan holds. Then it
writes the test first, waits for the light to turn green and asks a row of
strict reviewers to look before the pull request opens. The cat sleeps
through all of it.

You type `/mochi:build add a CSV export to the orders page`. The kit gives
Claude the questions to ask, the quality standard for the code and the points
where it must stop for your decision.

---

## How it works

1. **Plan.** Claude asks one round of questions. Then it writes a plan to
   `.plans/`, with acceptance scenarios, verified facts and the slices to build.
2. **Challenge.** A bar-raiser agent examines the plan before Claude writes
   code.
3. **Approve.** Claude opens an HTML view of the plan with a data-flow
   diagram. For a frontend change, the view also shows each screen before and
   after the change. You approve the plan.
4. **Build.** Each slice starts with a test that fails because the behaviour
   does not exist yet. Claude writes the code and runs the typecheck, lint and
   tests of your project. Then it tidies the code that it changed. It commits
   each slice and pushes it to a feature branch. It never pushes to the default
   branch.
5. **Review.** Reviewers examine the branch one area at a time: correctness,
   tests, hygiene and the conventions of your stack. For a small area, one
   quick reviewer does the first three. Each finding has a grade: 🔴 Critical,
   🟠 High, 🟡 Medium or 🔵 Minor. You select the findings to fix.
6. **Pull request.** Run `/mochi:pr`. It writes a short body with a TL;DR
   and the reasons, and it opens the pull request as a draft.

---

## Install

Run these commands in the project where you want to use the kit:

```bash
claude plugin marketplace add negimatare/negima-mochi
claude plugin install mochi@negima-mochi --scope local
claude plugin install mochi-react@negima-mochi --scope local   # React + Fluent UI projects only
claude plugin install mochi-python@negima-mochi --scope local  # FastAPI services only
```

The `--scope local` option writes the install to
`.claude/settings.local.json`. Git ignores this file, so the install has no
effect on your team.

The marketplace follows the `main` branch, which holds only releases. To stay
on one release, add its tag from the
[releases](https://github.com/negimatare/negima-mochi/releases) to the
marketplace source. Replace `v1.x.y` with that tag:

```bash
claude plugin marketplace add negimatare/negima-mochi#v1.x.y
```

To move a pinned install to a different release:

1. Remove the marketplace with
   `claude plugin marketplace remove negima-mochi`. This also uninstalls its
   plugins.
2. Add the marketplace again with the new tag.
3. Install the plugins again, with the same commands as before.

Then run `/mochi:setup-project` one time. This command writes a short
`CLAUDE.md` with the commands that your project really uses for verification,
and the commands of your pull request CI to run before a push. It also makes
sure that each command works.

| Plugin | Contents |
|---|---|
| `mochi` | The workflows, the working principles, the generic reviewers and a dependency policy. It works with all languages. |
| `mochi-react` | Conventions, reviewers, and lint and test hooks for React with Fluent UI v9 and Griffel. It has no commands. It extends the `mochi` workflows. |
| `mochi-python` | Conventions, reviewers, and lint and test hooks for FastAPI services: vertical slices (each with a Cosmic Python domain model inside), REST rules and a committed OpenAPI spec. It has no commands. It extends the `mochi` workflows. |

The kit adds no MCP servers, no hosted review and no CI changes. Its hooks run
only local commands. It uses only the tools that your project has installed.

---

## Commands

| Command | Use it to | It stops for you to |
|---|---|---|
| `/mochi:setup-project [folder]` | Prepare a project or a package | Approve its `CLAUDE.md` |
| `/mochi:build <request or plan>` | Build a feature or a change | Approve the plan, select where to review, then select the review findings |
| `/mochi:refactor <area> [goal]` | Improve code without a change in behaviour | Select the candidates, then approve each plan |
| `/mochi:fix-bug <report>` | Fix a bug, test first | Confirm the cause and the fix |
| `/mochi:review [PR or branch]` | Review any change | Select the findings after each area |
| `/mochi:pr` | Open the pull request, or restack a stack, with `gh stack` when you have it | Approve the body, select its comments and approve each force-push |
| `/mochi:split <plan>` | Divide a plan that is too big into parts, with one pull request for each part | Accept the parts, and select: in order or stacked |

Write a request as you write a brief for a colleague. Include the decisions
that you made and the work to skip. [docs/workflows.md](docs/workflows.md)
gives the steps of each command.

### The skills and agents of each command

![The skills, agents and conventions that each command runs](docs/skill-map.svg)

A dashed line shows a link that applies only when a condition is true. Open
[docs/skill-map.html](docs/skill-map.html) in a browser. Move the pointer onto
a command to see its links. Move the pointer onto a line to see its condition.
The page also shows all links in a table.

---

## Automatic behaviour

- Each session starts with the working principles in its context. A new
  session shows a banner from one of the reviewer monitors. To hide the
  banner, set `MOCHI_BANNER=0`.
- The banner shows the version of each mochi plugin that is installed for the
  project, on one line. When a newer release is on GitHub, a bold orange `↑`
  follows each older plugin, and the end of the line shows the version of
  that release, for example `↑ 1.x.0 latest`. To get the latest release, the
  banner sends one request to the GitHub API each 12 hours at most. To stop
  this request, set `MOCHI_UPDATE_CHECK=0`.
- The principles set how Claude writes. The text that mochi owns, for
  example plans, commit messages and pull requests, is in
  [STE](https://www.asd-ste100.org/), in a UK English tone. A code comment is the
  last resort: Claude first makes the code clear with names.
- Before a command adds or upgrades a package, the kit asks for permission. The
  prompt tells you the checks of the dependency policy. An install from the
  lockfile does not need permission.
- In a React + Fluent UI package, `mochi-react` adds its conventions to the
  context. It does this when a session starts in the package, or when Claude
  reads, writes or edits a file that a convention covers. It runs ESLint `--fix`
  after each edit. Before Claude ends a turn, it runs `typecheck` and `test`.
- In a FastAPI package, `mochi-python` does the same with the tools in the
  virtualenv of your project. It runs Ruff `--fix` after each edit. Before
  Claude ends a turn, it runs the type checker (pyright or mypy), the
  import-linter contracts and pytest.

---

## Reviewers

Each reviewer has the name of a Forerunner monitor. The transcript shows the
role of the reviewer next to its name.

| Agent | Checks | Plugin |
|---|---|---|
| `05-032-mendicant-bias` | The plan, before Claude writes code | `mochi` |
| `001-shamed-instrument` | Correctness, tests and hygiene in one quick pass, for a small area | `mochi` |
| `117649-despondent-pyre` | Correctness: logic, error paths and security | `mochi` |
| `049-abject-testament` | Tests: the most protection for the lowest cost | `mochi` |
| `2401-penitent-tangent` | Hygiene: dead code, comments that do not agree with the code, and rename leftovers | `mochi` |
| `031-exuberant-witness` | Data: indexes, statement timeouts, query fan-out and migrations | `mochi` |
| `859-static-carillon` | Accessibility of all markup, when no stack plugin reviews it | `mochi` |
| `343-guilty-spark` | React, Fluent UI and Griffel conventions that lint cannot check | `mochi-react` |
| `000-tragic-solitude` | Accessibility problems that lint cannot find | `mochi-react` |
| `686-ebullient-prism` | Slices, domain model, layers and tests in FastAPI services | `mochi-python` |
| `295-harken-watch` | The API contract: breaking changes, errors, pagination and OpenAPI | `mochi-python` |

---

## Under the hood

<details>
<summary><b>Where the rules come from</b></summary>

When two sources have different rules, the first source in this list has
priority:

1. The `CLAUDE.md` of your project.
2. The stack plugin.
3. The [mochi principles](plugins/mochi/principles.md).

Claude uses the current code only for consistency, and never as the quality
standard. When two sources do not agree, Claude tells you and asks for a
decision.

</details>

<details>
<summary><b>Structure</b></summary>

```
.claude/                settings.json: draws the skill map again after Claude writes or edits a file in plugins/
.claude-plugin/         marketplace.json: the three plugins of the negima-mochi marketplace
plugins/                one folder for each plugin: mochi, mochi-react, mochi-python
  mochi/principles.md   the working principles at the start of each session
  */skills/             one workflow or convention in each folder, as a SKILL.md
  */agents/             the reviewers
  */hooks/, */scripts/  hooks.json and its Node scripts: they load conventions, run lint and
                        verification, check new dependencies and show the session banner
  */evals/              claude plugin eval cases, each with a fixture.sh and graders
docs/                   workflows.md and the skill map (svg, html, notes)
docs/readme/            the images of this README
extras/                 an optional context status line
scripts/                skill-map.mjs: draws and checks the skill map
.github/                the Skill map and CodeQL workflows, Dependabot, issue and pull request templates
```

</details>

<details>
<summary><b>Development</b></summary>

To load the plugins from the checkout without an install, run:

```bash
claude --plugin-dir ./plugins/mochi --plugin-dir ./plugins/mochi-react --plugin-dir ./plugins/mochi-python
```

[CONTRIBUTING.md](CONTRIBUTING.md) tells you how to validate the plugins,
update the skill map and run the eval suite.

</details>

---

## More

- [docs/workflows.md](docs/workflows.md): the steps of each command, the rules
  for branches and commits, and a repository with a frontend and a backend.
- [extras/](extras/README.md): an optional status line. It shows how full the
  context is and when to run `/compact`.
- [CHANGELOG.md](CHANGELOG.md): the changes in each release.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): the rules of behaviour for all participants.
- [CONTRIBUTING.md](CONTRIBUTING.md): how to work on the kit, its layout and
  its eval suite.
- [SECURITY.md](SECURITY.md): how to report a vulnerability privately.

---

## Credits

- **Reviewer names**: the Forerunner monitors of Halo. Halo is a trademark of
  Microsoft. This project has no affiliation with Microsoft.
- **Commit messages**: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
- **Skill layout**: the [Agent Skills specification](https://agentskills.io/specification).
- **FastAPI domain model**: based on *Architecture Patterns with Python* by Harry
  Percival and Bob Gregory, also known as [Cosmic Python](https://www.cosmicpython.com/).

Released under the [MIT License](LICENSE). Made by
[negimatare](https://github.com/negimatare).
