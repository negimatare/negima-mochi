---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^(status|local) '
flags: m
match: not_contains
arm: with-only
---
