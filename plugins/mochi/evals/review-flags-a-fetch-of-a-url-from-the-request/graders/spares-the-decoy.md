---
type: regex
pattern: '\[[ x]\][^\n]*?(🔴 Critical|🟠 High)\s+shop/webhooks\.py:(1[4-9]|20)(?![\d-])'
target:
  source: file
  path: .eval/review.md
match: not_contains
arm: with-only
---
