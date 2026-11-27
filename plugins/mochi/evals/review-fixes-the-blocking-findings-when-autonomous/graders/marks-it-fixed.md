---
type: regex
pattern: '\[x\][^\n]*(🔴 Critical|🟠 High)\??\s+src/discount\.ts:'
target:
  source: file
  path: .eval/review.md
arm: with-only
---
