---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^file \S+ .* src/cart\.ts$'
flags: m
match: contains
arm: with-only
---
