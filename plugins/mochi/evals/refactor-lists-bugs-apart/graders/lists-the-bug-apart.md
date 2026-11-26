---
type: regex
target:
  source: file
  path: .eval/working-files.txt
pattern: '^## Bugs[^\n]*\n(?:(?!## |=== )[^\n]*\n)*?[^\n]*refund\.ts:\d+'
flags: m
match: contains
arm: with-only
---
