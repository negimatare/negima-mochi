---
type: regex
pattern: 'do not change|weekly report'
flags: i
match: not_contains
target:
  source: file
  path: src/loyalty.ts
---
