---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^origin feat/\S+ '
flags: m
match: contains
arm: with-only
---
