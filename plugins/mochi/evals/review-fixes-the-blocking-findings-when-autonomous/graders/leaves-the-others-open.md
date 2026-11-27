---
type: regex
pattern: '\[x\][^\n]*(🟡 Medium|🔵 Minor)'
target:
  source: file
  path: .eval/review.md
match: not_contains
---
