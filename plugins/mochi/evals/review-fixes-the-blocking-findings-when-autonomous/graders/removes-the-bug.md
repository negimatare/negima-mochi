---
type: regex
pattern: 'total\(prices\)\s*-\s*percent\s*;'
target:
  source: file
  path: src/discount.ts
match: not_contains
---
