---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^local (feat/\S+) .*\n(?:file .*\n)*local \1 '
flags: m
match: contains
arm: with-only
---
