---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^file \S+ .* \.plans/'
flags: m
match: not_contains
arm: with-only
---
