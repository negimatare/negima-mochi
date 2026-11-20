---
type: regex
pattern: '^\s*import\b'
flags: m
match: not_contains
target:
  source: file
  path: web/receipt.ts
---
