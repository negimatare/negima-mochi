# <Project name>

<One paragraph: what it is, its stack, and what sits next to it that has its own
conventions.>

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
