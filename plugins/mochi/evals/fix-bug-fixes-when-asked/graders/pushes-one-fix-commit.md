---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^origin fix/\S+ '
flags: m
match: count:1
arm: with-only
---
