---
type: regex
target:
  source: file
  path: .eval/working-files.txt
pattern: '^=== \.plans/20261102-order-exports-2-[^\n]*\n(?:(?!=== )[^\n]*\n)*?[^\n]*Stacked on part 1'
flags: m
match: contains
arm: with-only
---
