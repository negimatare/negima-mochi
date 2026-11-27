---
type: regex
pattern: '\[[ x]\][^\n]*?(🔴 Critical|🟠 High)\s+(src/payments\.ts:[34]|\.env\.example:1)(?![\d-])'
target:
  source: file
  path: .eval/review.md
match: not_contains
arm: with-only
---
