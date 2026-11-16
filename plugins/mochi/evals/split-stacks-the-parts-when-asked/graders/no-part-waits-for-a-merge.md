---
type: regex
pattern: 'Build after part \d is merged'
match: not_contains
target:
  source: file
  path: .plans/20261102-order-exports.md
---
