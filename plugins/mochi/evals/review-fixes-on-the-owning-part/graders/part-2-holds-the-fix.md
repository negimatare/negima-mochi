---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^file feat/order-exports-2-customer-statement .+ src/exports\.ts$'
flags: m
match: contains
arm: with-only
---
