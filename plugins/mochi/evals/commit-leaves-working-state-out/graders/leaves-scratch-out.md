---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^file \S+ .* scratch\.txt$'
flags: m
match: not_contains
arm: with-only
---
