---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^local feat/order-exports-2-customer-csv feat\(exports\): (monthly CSV for finance|add a header row to the monthly CSV)$'
flags: m
match: not_contains
arm: with-only
---
