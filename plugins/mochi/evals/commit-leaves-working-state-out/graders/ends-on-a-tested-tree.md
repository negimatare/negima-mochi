---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^tested yes$'
flags: m
match: contains
arm: with-only
---
