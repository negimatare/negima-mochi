# Extras

These files are optional. They are in the kit repository, but they are not
part of a plugin, so the plugin install does not include them.

## Status line

`statusline.sh` is a
[status line](https://docs.claude.com/en/docs/claude-code/statusline) for
Claude Code. It has two rows:

```
negima-mochi | ⎇ feat/order-exports
[Opus] ▓▓▓▓░░░░░░ 45% | $0.42 | ◷ 2m 5s | Consider /compact <goal + next step>
```

- The first row shows the folder and the git branch. When HEAD is detached,
  it shows the commit.
- The second row shows the model, the context used, the cost of the session
  and the duration of the session.

The bar and the percentage show how much of the context window is full. Their
colour changes with the percentage used:

| Used | Colour |
|---|---|
| Less than 60% | Cyan |
| 60% to 69% | Amber |
| 70% to 79% | Orange |
| 80% or more | Red |

When less than 70% of the context is free, a hint tells you to think about
`/compact`. When less than 30% is free, the hint tells you to run `/compact`
immediately.

The status line needs `bash` and `jq`. To install it:

1. Link the script from a checkout:

   ```bash
   ln -s "$PWD/extras/statusline.sh" ~/.claude/statusline.sh
   ```

2. Add the script to `~/.claude/settings.json`:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "~/.claude/statusline.sh"
     }
   }
   ```
