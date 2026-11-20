---
type: regex
pattern: '/\s*1_?000\b'
match: not_contains
target:
  source: file
  path: src/loyalty.ts
---
