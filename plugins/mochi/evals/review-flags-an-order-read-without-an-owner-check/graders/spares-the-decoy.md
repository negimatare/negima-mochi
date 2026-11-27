---
type: regex
pattern: '\[[ x]\][^\n]*?(🔴 Critical|🟠 High)\s+src/routes/invoices\.ts:[4-9](?![\d-])'
target:
  source: file
  path: .eval/review.md
match: not_contains
arm: with-only
---
