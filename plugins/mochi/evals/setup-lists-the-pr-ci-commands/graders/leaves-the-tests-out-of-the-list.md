---
type: regex
pattern: 'Before a push to an open PR(?:(?!\n## )[\s\S])*\n(?:- )?`?npm (run )?test\b'
match: not_contains
target:
  source: file
  path: CLAUDE.md
---
