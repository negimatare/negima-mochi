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

A comment is the last resort. First make the code say it: a better name, an
extracted function, a named constant. Then comment only a *why* that the code
cannot carry, in one line: domain rationale, a workaround, the source of a
value, an accessibility intent. No comment that restates the code, the
function name, or the commit message. No one-time setup notes, and no plan-step
identifiers or scaffolding names in code. No "do not change this" warnings,
also when they give a reason: a test protects what must not change. A comment
that the project asks for, such as a licence header or a lint directive, stays
as the project writes it.

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
Nothing pushes to the default branch. Ask before you run a migration or
change local infrastructure. A project
without a `CLAUDE.md` needs `/mochi:setup-project` first.

## Writing

Write the text that mochi owns in
[ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/), so
that every reader, including a non-native reader, gets one meaning only.
Mochi owns plans, audits, findings files, pull request text, commit
messages, and a `CLAUDE.md` that `/mochi:setup-project` creates.

- Sentences of at most 20 words for an instruction, 25 for a description.
- Paragraphs of at most six sentences, one topic each.
- Active voice. Passive only when the agent is unknown.
- Simple verb forms only: imperative, simple present, simple past, simple
  future. No perfect or progressive tenses, no "would/should have been".
- One instruction per sentence.
- No `-ing` word unless it is part of a technical name.
- Keep the articles and the subject; do not cut words to make it short.
- No noun clusters of more than three words.
- One word for one meaning, and the same word every time. Prefer the simple,
  common word ("use", not "leverage"; "start", not "kick off").
- Use a vertical list when a sentence would hold more than one condition or
  step.

The tone is UK English with a neutral, formal register: "colour",
"organise", no slang. This is a preference, not a strict rule. A US word from
the request or the code is not an error.

Limits:

- Identifiers, file paths, product names, and quoted text are exact: keep
  them as they are, with code in backticks.
- In a file that mochi edits but does not own, keep the language of that
  file. This includes a `CLAUDE.md` that `/mochi:setup-project` refreshes.
- A project rule wins, by the order in **Where the standard comes from**: for
  example a language in its `CLAUDE.md`, or its commit guideline.
- This rule is for the text that mochi writes. It is not a review check: a
  reviewer does not report US spelling, STE grammar, or sentence length in
  the user's code or text.

## Communication

State problems directly, with the reason. Lead with the outcome. When unsure,
say what is unverified instead of guessing.

Answer what was asked, and stop at the answer: no list of caveats, no theory
about an issue that is behind you. Give a caveat one time; leave it out of
later summaries.
