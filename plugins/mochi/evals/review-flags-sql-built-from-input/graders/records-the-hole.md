---
type: regex
pattern: '\[[ x]\][^\n]*?(🔴 Critical|🟠 High)\??\s+shop/search\.py:([6-9]|10)\b'
target:
  source: file
  path: .eval/review.md
match: contains
arm: with-only
---
