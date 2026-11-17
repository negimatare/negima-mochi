# Extras

Optional pieces that go with the kit but are not part of any plugin.
Installing the plugins does not install them.

## Status line

`statusline.sh` is a two-row
[status line](https://docs.claude.com/en/docs/claude-code/statusline) for
Claude Code:

```
negima-mochi | ⎇ feat/order-exports
[Opus] ▓▓▓▓░░░░░░ 45% | $0.42 | ◷ 2m 5s | Consider /compact <goal + next step>
```

The first row is the folder and the git branch, or the commit when HEAD is
detached. The second is the model, the context used, the session cost, and
how long the session has run.

The bar and the percentage show how much of the context window is used. Their
colour changes as it fills: cyan below 60%, amber from 60%, orange from 70%,
and red from 80%. Below 70% remaining, a hint suggests `/compact`; below 30%,
it tells you to run it now.

It needs `bash` and `jq`. To install it, link it from a checkout:

```bash
ln -s "$PWD/extras/statusline.sh" ~/.claude/statusline.sh
```

Then point Claude Code at it in `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```
