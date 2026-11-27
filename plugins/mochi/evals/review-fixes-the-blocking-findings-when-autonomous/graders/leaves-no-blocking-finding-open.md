---
type: regex
pattern: '\[ \][^\n]*(🔴 Critical|🟠 High)'
target:
  source: file
  path: .eval/review.md
arm: with-only
match: not_contains
---
