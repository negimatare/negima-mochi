---
type: regex
pattern: '\[[ x]\][^\n]*?(🔴 Critical|🟠 High)\s+shop/search\.py:1[3-9](?![\d-])'
target:
  source: file
  path: .eval/review.md
match: not_contains
arm: with-only
---
