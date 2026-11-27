---
name: split
description: Split a plan that is too big into smaller plans, called parts, each with its own branch and pull request — cut by user-visible outcome so every part is useful on its own, account for every slice and scenario, stop for the user to accept the split and choose whether the parts are built in order or stacked, then write the parts and challenge the first. Never writes code — /mochi:build implements one part at a time. Use when the user asks to split, cut down, or break up a plan.
argument-hint: "[.plans/ file] [how you want it split, if you know; \"stacked\" to stack the parts]"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/skills/plan/scripts/plan-view.mjs *)
---

# Split a plan

The user's arguments: `$ARGUMENTS`

Turn one plan into parts that can each be built, reviewed, and merged on their
own. In this kit a slice is one commit inside a plan; a part is a whole plan.
This skill writes no code.

## 1. Read the plan

The plan is the `.plans/` file in the arguments. With none, list the plans in
`.plans/` and ask which one. A plan that is already an index of parts goes back
to the user with its parts. Read the plan in full, and the code its Approach
and Verified facts name.

## 2. Propose the parts

Cut by outcome, never by layer, size, or file. Each part must be:

- **Valuable**: it changes something for a named user or stakeholder. "Needed
  for later" is not a reason.
- **Visible**: that person can check the result without reading the code.
- **Vertical**: it works end to end, through every layer it needs.

A part that is only an API, only a schema, or only a UI fails the test; merge
it into the outcome it enables. One exception: when the plan's slices must
reach production in an order (a deploy order between deployables that do
not deploy together, a migration before the code that reads it), the step
that must ship first may be its own part, as long as it keeps the product
working unchanged for everyone using it today. So may a clean-up that can
only ship after every client has upgraded, as the last part. Name the order that forces each one. To find the cuts, narrow the case first (one
data shape, one kind of user), ship one workflow step, do the common behaviour
before a special policy or exception, or test a cheap assumption before the
build it would justify.

Every part must leave the product working and worth having if the later parts
never ship. Order the parts by user value, then by what the first part will
teach, then by real prerequisites; name each prerequisite. When the plan
already has one outcome, say so and stop: a long plan with one outcome is not a
split, and the user can cut its slices instead.

Account for everything: each slice and each Acceptance scenario of the plan
goes to exactly one part. List anything that fits no part as a proposed drop,
never a silent one.

Show the user, for each part: its outcome in one sentence, who can check it and
how, its scenarios and slices, and what stays useful if the rest is dropped.
Then the proposed drops, if any.

Then ask how the parts ship, unless the arguments already say:

- **In order** (the default): each part starts after the part before it is
  merged. Reviews are simple, but each part waits for the last review.
- **Stacked**: each part starts on the branch of the part before it, as soon as
  that branch is pushed, and its pull request targets that branch. Parts are
  reviewed in parallel, and each merge must be followed by a restack of the
  parts above it, which force-pushes their branches. With `gh stack`, one
  restack moves the whole stack.

This is the **first stop**: the user accepts or changes the split, and picks
in order or stacked. In autonomous mode, take the proposed split, in order,
and go on to step 3.

## 3. Write the parts

Write one plan per part, `.plans/<date>-<slug>-<n>-<part-slug>.md`, with the
plan's own `<date>` so the parts sort next to it, in the format of the plan
skill's section 3 (`${CLAUDE_PLUGIN_ROOT}/skills/plan/SKILL.md`). A part
may be shorter than 100 lines. Carry over the problem, the scenarios and slices
the part owns, and the verified facts it rests on; renumber its slices from 1.
Under the title of every part after the first, add, for parts in order:

```markdown
Part <n> of <total> of .plans/<date>-<slug>.md. Build after part <n-1> is merged, and
re-check this plan first: the code under it will have changed.
```

and for stacked parts:

```markdown
Part <n> of <total> of .plans/<date>-<slug>.md. Stacked on part <n-1>: build on its
branch once it is pushed, and re-check this plan first: the code under it will
have changed.
```

Replace the original plan with an index, and remove its view files
(`.plans/<date>-<slug>.view.json` and `.plans/<date>-<slug>.html`):

```markdown
# <Title> — split into parts

Build the parts in order, each on its own branch and pull request<, each
stacked on the part before it, when stacked>.

1. .plans/<date>-<slug>-1-<part-slug>.md — <outcome>. Ready to build.
2. .plans/<date>-<slug>-2-<part-slug>.md — <outcome>. <Build after part 1 is merged.
   | Stacked on part 1.>

Dropped with the user's agreement: <scenarios or slices, or "nothing">.
```

## 4. Check the first part

Challenge part 1 and render its view as the plan skill's steps 4 and 5 do: the
bar-raiser once, telling it the plan is part 1 of <total> of
`.plans/<date>-<slug>.md`, at most one re-check, then
`node ${CLAUDE_PLUGIN_ROOT}/skills/plan/scripts/plan-view.mjs .plans/<date>-<slug>-1-<part-slug>.md`.
The later parts are not challenged now: they are re-checked when it is their
turn.

## 5. Hand over

Show the user the index, the bar-raiser's verdict on part 1, and what changed
because of it. Open part 1's view. End with the command that builds it:
`/mochi:build .plans/<date>-<slug>-1-<part-slug>.md`.
