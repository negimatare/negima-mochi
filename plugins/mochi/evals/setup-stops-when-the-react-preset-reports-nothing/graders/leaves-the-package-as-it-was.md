---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^status '
flags: m
match: not_contains
arm: with-only
---
