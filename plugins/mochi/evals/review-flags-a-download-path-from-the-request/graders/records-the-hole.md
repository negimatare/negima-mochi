---
type: regex
pattern: '(🔴 Critical|🟠 High)\s+src/downloads\.ts:[7-9]\b'
target:
  source: file
  path: .eval/review.md
match: contains
arm: with-only
---
