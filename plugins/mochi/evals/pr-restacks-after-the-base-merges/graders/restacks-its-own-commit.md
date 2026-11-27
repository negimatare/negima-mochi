---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^local feat/order-exports-2-customer-csv feat\(exports\): per-customer CSV for support$'
flags: m
match: contains
arm: with-only
---
