---
type: regex
pattern: 'Before a push to an open PR(?:(?!\n## |\n```)[\s\S])*\n```[a-z]*\n(?:(?!\n```)[\s\S])*deploy-preview'
match: not_contains
target:
  source: file
  path: CLAUDE.md
---
