---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^local '
flags: m
match: not_contains
arm: with-only
---
