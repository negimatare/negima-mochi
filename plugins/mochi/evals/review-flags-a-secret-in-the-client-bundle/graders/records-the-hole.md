---
type: regex
pattern: '\[[ x]\][^\n]*?(🔴 Critical|🟠 High)\??\s+(src/payments\.ts:([6-9]|1[0-7])|\.env\.example:(1-)?2)\b'
target:
  source: file
  path: .eval/review.md
match: contains
arm: with-only
---
