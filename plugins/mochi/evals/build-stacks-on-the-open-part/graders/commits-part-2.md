---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^local feat/order-exports-2-\S* '
flags: m
match: contains
arm: with-only
---
