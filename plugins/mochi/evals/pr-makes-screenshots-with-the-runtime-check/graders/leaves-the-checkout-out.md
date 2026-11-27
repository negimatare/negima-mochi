---
type: regex
pattern: '^items=0 tree=(checkout|other) '
flags: m
target:
  source: file
  path: .eval/runtime-runs.log
match: not_contains
---
