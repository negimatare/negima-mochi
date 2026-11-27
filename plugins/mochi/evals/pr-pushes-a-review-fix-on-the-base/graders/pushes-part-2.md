---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^origin feat/order-exports-2-customer-statement fix\(exports\): divide the cents by 100$'
flags: m
match: contains
arm: with-only
---
