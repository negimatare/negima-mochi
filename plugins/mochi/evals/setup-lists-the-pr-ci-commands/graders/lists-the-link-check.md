---
type: regex
pattern: 'Before a push to an open PR(?:(?!\n## )[\s\S])*\n(?:- )?`?node scripts/check-links\.mjs'
target:
  source: file
  path: CLAUDE.md
---
