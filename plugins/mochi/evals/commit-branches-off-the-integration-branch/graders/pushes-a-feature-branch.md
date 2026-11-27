---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^origin [a-z]+/\S+ '
flags: m
match: contains
arm: with-only
---
