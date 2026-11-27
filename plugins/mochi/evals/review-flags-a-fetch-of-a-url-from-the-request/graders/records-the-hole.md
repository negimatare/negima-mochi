---
type: regex
pattern: '(🔴 Critical|🟠 High)\s+shop/webhooks\.py:([89]|1[01])\b'
target:
  source: file
  path: .eval/review.md
match: contains
arm: with-only
---
