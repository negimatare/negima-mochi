---
type: regex
pattern: '\[[ x]\][^\n]*?(🔴 Critical|🟠 High)\??\s+src/routes/orders\.ts:[4-9]\b'
target:
  source: file
  path: .eval/review.md
match: contains
arm: with-only
---
