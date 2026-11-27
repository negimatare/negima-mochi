---
type: regex
pattern: '\[[ x]\][^\n]*?(🔴 Critical|🟠 High)\??\s+src/downloads\.ts:1[1-3](?!\d)'
target:
  source: file
  path: .eval/review.md
match: not_contains
arm: with-only
---
