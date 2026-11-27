---
type: regex
pattern: '\[ \][^\n]*(🔴 Critical|🟠 High)'
target:
  source: file
  path: .eval/review.md
match: not_contains
---
