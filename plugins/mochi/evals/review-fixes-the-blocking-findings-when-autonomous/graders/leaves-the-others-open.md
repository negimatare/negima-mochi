---
type: regex
pattern: '\[x\][^\n]*(🟡 Medium|🔵 Minor)'
target:
  source: file
  path: .eval/review.md
arm: with-only
match: not_contains
---
