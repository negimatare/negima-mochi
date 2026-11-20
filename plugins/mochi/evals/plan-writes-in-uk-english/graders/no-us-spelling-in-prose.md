---
type: regex
pattern: '(?<![\w`])(favorite|color)s?(?!\w)'
flags: i
match: not_contains
target:
  source: file
  path: .eval/plan.md
---
