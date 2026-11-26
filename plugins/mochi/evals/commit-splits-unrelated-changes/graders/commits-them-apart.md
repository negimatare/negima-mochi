---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^file (\S+ .+) README\.md\n(?:file \1 .+\n)*file \1 src/'
flags: m
match: not_contains
arm: with-only
---
