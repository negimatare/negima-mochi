---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^file feat/order-exports-1-monthly-csv .+ src/exports\.ts$'
flags: m
match: contains
arm: with-only
---
