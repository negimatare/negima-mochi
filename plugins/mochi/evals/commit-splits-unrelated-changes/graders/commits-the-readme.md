---
type: regex
target:
  source: file
  path: .eval/end-state.txt
pattern: '^file \S+ .+ README\.md$'
flags: m
match: contains
arm: with-only
---
