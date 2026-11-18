---
name: plan
description: Plan a non-trivial change before writing code — question the user on intent and scope, verify every fact the design rests on, write one short plan file with acceptance scenarios, have the bar-raiser challenge it once, and render an HTML view of its data flow and, for frontend changes, its screens before and after. Never writes code — an approved plan is implemented with /mochi:build. Use when the user asks to plan, design, or build a feature or a change that touches more than one place.
argument-hint: "[what to build, plus anything already decided]"
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/plan-view.mjs *)
user-invocable: false
---

# Plan

The user's request: `$ARGUMENTS`

One pass of questions, one plan file, one challenge from the bar-raiser, at
most one re-check, one HTML view. No debate rounds.

## 1. Question the user

Before reading code in depth, ask what the request leaves open, in one round,
at most four questions: the need behind it (who is blocked, what they do
today), what is out of scope, how we will know it works, and any constraint
(deadline, compatibility, cost). Skip what the request answers. If the need is
unclear, say so: ease of implementation is not a reason to build something.

## 2. Ground it in the code

Find where the change lands and how neighbouring code solves the same problem
— as inspiration, not as the standard. Every fact the design depends on (an
API's behaviour, where a value is written, what a config does) is read in its
source and recorded with `path:line` or a URL. A fact you could not read is
written down as unverified. When the change touches the frontend, also read
the screens it changes and the files that define the product's design tokens:
the plan view copies both.

Before adding a responsibility — a rule, a calculation, a format, a flow —
look for code that already owns it, anywhere in the product. Search by
meaning, not by name: follow the domain concept through callers, data flow,
and tests, because the existing owner often has a different name. A candidate
fits when it owns the same rule for the same purpose; similar-looking code
that serves another purpose does not. Take the first outcome that holds:

1. **Reuse** the existing solution as it is.
2. **Change** it, when the new need belongs to the responsibility it owns.
3. **Extract** the part that fits into its own module, keeping the original
   caller's behaviour.
4. **Add** a new one, saying why no candidate fits.

This is about one home for a rule, not about copying a neighbour's patterns.
Do not merge code that only looks alike, and do not build for reuse nobody
needs yet. When the choice would change another team's code or an
architectural decision, it is an open question for the user.

When the request and a project rule disagree — the request says to do it
"the same way as" code that breaks the project's `CLAUDE.md`, or asks for
something `CLAUDE.md` rules out — do not settle it in the design. Stop and ask
the user before writing the plan: what each side asks for, with `path:line`,
and the one you recommend.

## 3. Write the plan

Write `.plans/<date>-<short-slug>.md` at the repository root, 100–200 lines.
`<date>` is the day the plan is written as `YYYYMMDD` (`date +%Y%m%d`) and
`<short-slug>` names the feature, for example
`.plans/20261105-member-discount.md`. The view
files below share the name. Never another name: no `plan-` prefix, no round
or version suffix. Revising the plan keeps its file and its date.

```markdown
# <Title>

## Problem
<Who needs what, and why now. For a refactor: the audit file and the
candidates this plan covers.>

## Out of scope
- <...>

## Acceptance
<Gherkin scenarios for user-visible behaviour, one per behaviour; a checklist
for anything else. For a refactor: "Behaviour must not change", then the
behaviours it touches and the pinning test for each — an existing test by
path, or one to write before the refactor.>

## Approach
Existing solution: <reuse | change | extract | add> — <owner path:line, or why none fits>
<Layers and files touched, what each change does, and why this way. One line
per alternative considered and why it lost.>

## Data flow
<Numbered steps: what happens, in which component, in the order data moves.
One step per hop, naming the slice or the existing code involved. For a
change inside one component, one line saying so.>
1. <...>

## Verified facts
- <claim> — <path:line or URL>
- UNVERIFIED: <claim> — <why it could not be read>

## Tests
<One test per behaviour, and at which level.>

## Slices
<In build order. Each slice is one behaviour with its tests (for a refactor,
one step that keeps every pinning test green), small enough to be one commit
that leaves the code working. Each gives a rough count of the lines it
changes, tests included, lockfiles and generated files not.>
1. <slice> (~<n> lines) — tests: <...>

## Risks and open questions
- <...>
```

No code and no function names beyond what already exists: the design inside
each file is decided while implementing.

## 4. Challenge it once

Launch the bar-raiser with `subagent_type` set to
`mochi:05-032-mendicant-bias`, the task description `bar-raiser — challenge
the plan`, the plan path, and the project `CLAUDE.md` path. Then:

- Check each `must` concern against the code yourself; drop one that does not
  hold, saying why in one line.
- Apply the fixes that hold to the plan.
- If there was at least one `must`, send the revised plan back to the
  bar-raiser **once**, asking only whether those concerns are resolved.
  Continue the same agent with SendMessage, since it has already read the
  code; launch a new one (task description `bar-raiser — re-check`) only
  when it cannot be continued. Anything still open after that goes to the
  user as an open question — there is no further round.

## 5. Render the view

Write `.plans/<date>-<short-slug>.view.json` from the final plan, following
[the plan view rules](references/plan-view.md), then run:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/plan-view.mjs .plans/<date>-<short-slug>.md
```

It writes `.plans/<date>-<short-slug>.html`. When the layout breaks a rule, it
names the problem and exits with an error: fix the JSON and run it again.

The diagram is drawn when the flow crosses at least two components; the
screens, when the change touches the frontend. A component is a module,
package, or service with its own folder, and a call into another one's code
counts, even through a function it already has. With neither, skip this step
and say why.

The view is not a separate approval: it is shown with the plan.

## 6. Hand over

Show the user: the bar-raiser's verdict, what changed in the plan because of
it, and the open questions. Open the view for them (`open` on macOS,
`xdg-open` on Linux; otherwise give its path). Then stop: this skill never
writes code.

When the plan has more than six slices, or its slices add up to more than
about 400 lines, it is too big for one pull request to review well: say so
and suggest `/mochi:split .plans/<date>-<short-slug>.md` before
building, so each part gets its own branch and pull request. Suggest it too
when its slices must reach production at different times: a deploy order
between packages, a migration that must land before the code that reads it,
or a clean-up that waits until every client has upgraded. One pull request
ships its slices together, so it cannot keep that order. It is a suggestion,
not another stop.

When `/mochi:build` ran this skill, build continues once the user approves.
Otherwise, end with the command that implements the approved plan:
`/mochi:build .plans/<date>-<short-slug>.md`.
