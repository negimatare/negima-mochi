# <Project name>

<One paragraph: what it is, its stack, and what sits next to it that has its own
conventions.>

Integration branch: `<name>` <Only in the root CLAUDE.md, and only when
pull requests go to a branch other than the one origin/HEAD names; one
line, which the mochi scripts read.>

## Scope override

<Only when an ancestor CLAUDE.md describes another stack or contradicts this
project. Name the ancestor files and exactly what does not apply here.>

## Verification

Run from this folder before calling a change done:

```bash
<typecheck command>   # <what it really checks; any trap, e.g. bare tsc checks nothing>
<lint command>        # <what it enforces beyond style>
<test command>
```

<Build targets, if there is no single build command.>

## Runtime check

<Only when the project has a UI and a driver for it.> Opens the app with
nothing real behind it (<the fakes: a device, a service, a sample config>)
and saves a screenshot of each screen and a log to `$OUT`:

```bash
<driver command> --out "$OUT"
```

## Before a push to an open PR

The commands of the `pull_request` CI jobs that Verification does not run.
Run them and Verification before each push to a branch with an open pull
request:

```bash
<command>   # <CI job>
```

<Each job that cannot run locally, and why: a deploy, a secret, a service.>

## Dead-code check

Run from this folder by reviews and audits, not part of verification:
existing code may still fail it.

```bash
<dead-code command>   # <installed knip or vulture, never npx/uvx; the config that names its entry points>
```

## Where the rules live

General conventions come from the Negima Mochi plugins: `mochi`<, and
`mochi-react` or `mochi-python` for this stack>. What only applies here:

| Working on | Read |
|---|---|
| <topic> | `<doc path>` |

## Project-specific rules

- <Rule.> <Reason in a few words.>
- <Files that must stay in sync, and the exception if any.>
- <Before adding a package, check what <sibling projects> already use.>
- <Manual checks the tests cannot do.>
