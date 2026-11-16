# Engineering Principles

Standing defaults for every task in this project. The user should never have to
restate them in a prompt.

## Goal

High quality reached the simplest and cheapest way. Prefer the smallest change
that fully solves the problem; do not build for a requirement nobody stated.

## Where the standard comes from

Resolve rules in this order, most specific wins:

1. The project's `CLAUDE.md` (and the `docs/` it links, if any).
2. Stack plugins (for example `mochi-react` or `mochi-python`).
3. These principles.
4. Existing code — for consistency only where no rule applies.

Existing code is a source of inspiration, never the standard. A neighbouring
feature doing something is not a reason to repeat it: judge each pattern on its
merits, cite a neighbour only to support a choice that is already sound, and
flag the neighbour's flaw as a follow-up instead of copying it.

When two sources contradict each other, say so and ask. Do not pick one
silently.

## Adopting conventions

Adopt a convention where its reasoning transfers to this codebase. Reject the
parts that exist only because the reference project has a different context
(it ships a library, it has a visual-regression suite, it runs at another
scale).

A shared abstraction earns its place on its second real consumer. Until then,
the code stays where its single consumer lives.

## Comments

One line of non-obvious *why*: domain rationale, a workaround, a magic number's
derivation, an accessibility intent. No comment that restates the code, the
function name, or the commit message. No plan-step identifiers or scaffolding
names in code.

## Tests

Protect the code with the minimum testing cost:

- One test per distinct behaviour. No table cases that hit the same branch, no
  test duplicated at another level, no low-value edge cases.
- Assert behaviour the user or caller can observe, not internal structure.
- Never wait on real time; use fake timers.
- A failing test is the specification. If it must change to pass, say so and
  why — never bend it silently.

## Verification

A task is done when the project's verification commands (listed in its
`CLAUDE.md`) pass and the change reads like it was written on purpose: no dead
code, no stale comments, no old names left behind after a rename.

## Dependencies

Adding a package is a security decision: follow the `dependencies` skill before
installing anything.

## Workflow

`/mochi:build` runs the whole flow: plan, then slice by slice implement
test-first, tidy, commit, and push to a feature branch, then review and fix;
`/mochi:build <plan path>` resumes from an approved plan, and
`/mochi:split <plan path>` cuts one too big for a single pull request into
parts. Restructuring
existing code starts with `/mochi:refactor <area>`, which audits the area and
plans the refactor that build then implements. Bugs go through
`/mochi:fix-bug`, reproduced by a failing test before any fix.
`/mochi:review` reviews any change, and `/mochi:pr` opens the pull request.
Nothing pushes to the default branch. A project
without a `CLAUDE.md` needs `/mochi:setup-project` first.

## Communication

State problems directly, with the reason. Lead with the outcome. When unsure,
say what is unverified instead of guessing.
